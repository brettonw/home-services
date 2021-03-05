""" Platform for brettonw temperature sensor integration. """
from homeassistant.const import CONF_HOST, CONF_NAME, TEMP_CELSIUS
from homeassistant.helpers.entity import Entity
from homeassistant.components.sensor import PLATFORM_SCHEMA, EntityComponent
import voluptuous as vol
import homeassistant.helpers.config_validation as cv
from urllib import request, parse
from urllib.error import URLError
import json
import logging

_LOGGER = logging.getLogger(__name__)

DOMAIN = "brettonw_temperature"

CORRECTION = "correction"

PLATFORM_SCHEMA = PLATFORM_SCHEMA.extend(
    {
        vol.Required(CONF_HOST): cv.string,
        vol.Required(CONF_NAME): cv.string
    }
)

def setup_platform(hass, config, add_entities, discovery_info=None):
    """Set up the sensor platform."""
    add_entities([BrettonwTemperatureSensor(config[CONF_HOST], config[CONF_NAME])])

class BrettonwTemperatureSensor(Entity):
    """Representation of the brettonw temperature sensor."""

    def __init__(self, host, name):
        """Initialize the sensor."""
        self._state = None
        self._host = host
        self._name = name
        self.update()

    def api(self, path):
        url = "http://{}{}".format(self._host, path)
        req = request.Request(url)
        with request.urlopen(req) as response:
            resp_data = json.loads(response.read().decode())
        response = resp_data[-1]
        _LOGGER.debug(response)
        # this sensor just wants the last entry in the array
        return response

    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name;

    @property
    def state(self):
        """Return the state of the sensor."""
        return self._state["temperature"]

    @property
    def unit_of_measurement(self):
        """Return the unit of measurement."""
        return TEMP_CELSIUS

    def update(self):
        """Fetch new state data for the sensor."""
        try:
            self._state = self.api ("/temperature.json")
        except URLError as e:
            _LOGGER.error(
                "Unable to retrieve data from Infinitude: {}".format(e.reason)
            )
            return
