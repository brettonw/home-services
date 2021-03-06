#! /usr/bin/env bash

# configure a sensor
workingPath="/home/brettonw/bin";
sensorFile="$workingPath/sensor.py";
if [ -e "$sensorFile" ]; then
  echo "Removing existing sensor configuration";
  ls -l "$sensorFile";
  rm -f "$sensorFile";
fi

. /home/brettonw/bin/install.bash;
