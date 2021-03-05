#! /usr/bin/env python3

import board
import adafruit_hts221

sensor = adafruit_hts221.HTS221 (board.I2C())

# temperature/relative humidity/pressure
print("{{ \"temperature\": {:5.3f}, \"temperature-unit\": \"C\", \"humidity\": {:5.3f}, \"humidity-unit\": \"%\" }}".format(sensor.temperature, sensor.relative_humidity))
