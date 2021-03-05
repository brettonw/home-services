#! /usr/bin/env python3

import board
import adafruit_sht31d

sensor = adafruit_sht31d.SHT31D (board.I2C())

print("\"temperature\": {:5.3f}, \"temperature-unit\": \"C\", \"humidity\": {:5.3f}, \"humidity-unit\": \"%\"".format(sensor.temperature, sensor.relative_humidity))
