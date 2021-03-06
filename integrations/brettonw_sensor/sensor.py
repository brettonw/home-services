""" Platform for brettonw sensor integration.

Example configuration.yaml entry:


sensor:
  - platform: brettonw_sensor
    name: "Test0 Brettonw"
    host: "rpi-test-0"
    scan_interval: 30
    temperature_correction: 0

"""

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
    if ((now - fallback["timestamp"]) > refreshInterval):
        url = "http://{}.local/sensor/now.json".format (host)
        req = request.Request(url)
        with request.urlopen(req) as response:
            result = json.loads(response.read().decode())
    return result

def setup_platform(hass, config, add_entities, discovery_info=None):
    """Set up the sensor platform."""
    if (not (DOMAIN in hass.data)):
      hass.data[DOMAIN] = { }
    dataHost = hass.data[DOMAIN]
    record = dataHost[config[CONF_HOST]] = api (config[CONF_HOST], { "timestamp": 0 }, 0)
    if (record["temperature"] != "-"):
        correction = 0
        if (TEMPERATURE_CORRECTION in config):
            correction = config[TEMPERATURE_CORRECTION]
        add_entities([BrettonwTemperatureSensor(hass, config[CONF_HOST], config[CONF_NAME] + "_temperature", correction)])
        """
    if (record["humidity"] != "-"):
        async_add_entities([BrettonwHumiditySensor(config[CONF_HOST], config[CONF_NAME])])
    if (record["pressure"] != "-"):
        async_add_entities([BrettonwPressureSensor(config[CONF_HOST], config[CONF_NAME])])
        """

class BrettonwTemperatureSensor(Entity):
    """Representation of the brettonw temperature sensor."""

    def __init__(self, hass, host, name, correction):
        """Initialize the sensor."""
        self._hass = hass
        self._host = host
        self._name = name
        self._correction = correction
        self.update()

    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name

    @property
    def state(self):
        """Return the state of the sensor."""
        return self._hass.data[DOMAIN][self._host]["temperature"] + self._correction

    @property
    def unit_of_measurement(self):
        """Return the unit of measurement."""
        return TEMP_CELSIUS

    def update(self):
        """Fetch new state data for the sensor."""
        try:
            self._hass.data[DOMAIN][self._host] = api (self._host, self._hass.data[DOMAIN][self._host], DATA_REFRESH_INTERVAL_MS)
        except URLError as error:
            _LOGGER.error( "Unable to retrieve data from Sensor host ({}): {}".format(self._host, error.reason) )
            return
