""" Platform for brettonw sensor integration. """
from homeassistant.const import CONF_HOST, CONF_NAME, TEMP_CELSIUS, PRESSURE_HPA, PERCENTAGE, DEVICE_CLASS_TIMESTAMP, DEVICE_CLASS_TEMPERATURE, DEVICE_CLASS_HUMIDITY, DEVICE_CLASS_PRESSURE
from homeassistant.helpers.entity import Entity
from homeassistant.components.sensor import PLATFORM_SCHEMA
import voluptuous as vol
import homeassistant.helpers.config_validation as cv
from urllib import request, parse
from urllib.error import URLError
import json
import logging
from datetime import timedelta, datetime

_LOGGER = logging.getLogger(__name__)

DOMAIN = "brettonw_sensor"
DOMAIN_DATA = DOMAIN + "data"

SCAN_INTERVAL = timedelta(seconds=10)
DATA_REFRESH_INTERVAL_MS = 10 * 1000

TEMPERATURE_CORRECTION = "temperature_correction"

PLATFORM_SCHEMA = PLATFORM_SCHEMA.extend(
    {
        vol.Optional(TEMPERATURE_CORRECTION): cv.string,
        vol.Required(CONF_HOST): cv.string,
        vol.Required(CONF_NAME): cv.string
    }
)

def api(host, fallback, refreshInterval):
    result = fallback
    now = datetime.timestamp(datetime.now()) * 1000
    _LOGGER.debug("Request from host: {}".format (host))
    if ((now - fallback["timestamp"]) > refreshInterval):
        url = "http://{}.local/sensor/now.json".format (host)
        _LOGGER.debug("Request from url: {}".format (url))
        req = request.Request(url)
        with request.urlopen(req) as response:
            _LOGGER.debug("response as json: {}".format (response))
            result = json.loads(response.read().decode())
            #_LOGGER.debug(resp_data)
    return result

def setup_platform(hass, config, add_entities, discovery_info=None):
    """Set up the sensor platform."""
    record = hass.data[DOMAIN] = api (config[CONF_HOST], { "timestamp": 0 }, 0)
    _LOGGER.debug("Got record")
    if (record["temperature"] != "-"):
        add_entities([BrettonwTemperatureSensor(hass, config[CONF_HOST], config[CONF_NAME] + "_temperature")])
        """
    if (record["humidity"] != "-"):
        async_add_entities([BrettonwHumiditySensor(config[CONF_HOST], config[CONF_NAME])])
    if (record["pressure"] != "-"):
        async_add_entities([BrettonwPressureSensor(config[CONF_HOST], config[CONF_NAME])])
        """

class BrettonwTemperatureSensor(Entity):
    """Representation of the brettonw temperature sensor."""

    def __init__(self, hass, host, name):
        """Initialize the sensor."""
        self._hass = hass
        self._host = host
        self._name = name
        self.update()

    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name

    @property
    def state(self):
        """Return the state of the sensor."""
        return self._hass.data[DOMAIN]["temperature"]

    @property
    def unit_of_measurement(self):
        """Return the unit of measurement."""
        return TEMP_CELSIUS

    def update(self):
        """Fetch new state data for the sensor."""
        try:
            self._hass.data[DOMAIN] = api (self._host, self._hass.data[DOMAIN], DATA_REFRESH_INTERVAL_MS)
        except URLError as error:
            _LOGGER.error( "Unable to retrieve data from Sensor host ({}): {}".format(self._host, error.reason) )
            return
