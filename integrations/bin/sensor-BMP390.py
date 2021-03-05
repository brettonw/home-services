#! /usr/bin/env python3

import board
import adafruit_bmp3xx

sensor = adafruit_bmp3xx.BMP3XX_I2C (board.I2C())

# temperature/relative humidity/pressure
print("\"temperature\": {:5.3f}, \"temperature-unit\": \"C\", \"pressure\": {:5.3f}, \"pressure-unit\": \"hPa\"".format(sensor.temperature, sensor.pressure))

