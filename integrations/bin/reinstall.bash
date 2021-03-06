#! /usr/bin/env bash

# configure a sensor
workingPath="/home/brettonw/bin";
sensorFile="$workingPath/sensor.py";
if [ -e "$sensorFile" ]; then
  existing=$(ls -l "$sensorFile" | sed -e "s/^.*-> //");
  existing=$(basename "$existing" | sed -e "s/sensor-//" | sed -e "s/.py$//");
  rm -f "$sensorFile";
  echo "Removed existing sensor configuration ($existing).";
fi

. /home/brettonw/bin/install.bash;
