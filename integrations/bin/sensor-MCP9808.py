#! /usr/bin/env python3

import board
import adafruit_mcp9808

sensor = adafruit_mcp9808.MCP9808 (board.I2C())

# temperature/relative humidity/pressure
print("\"temperature\": {:5.3f}, \"temperature-unit\": \"C\"".format(sensor.temperature))

