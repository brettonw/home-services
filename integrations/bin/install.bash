#! /usr/bin/env bash

# configure the target dir
sensorDir="/var/www/html/sensor";
sudo rm -rf "$sensorDir";
if [ ! -d "$sensorDir" ]; then
  sudo mkdir "$sensorDir";
  sudo chown brettonw:brettonw "$sensorDir";
  chmod ugo+r "$sensorDir";
fi

# configure a sensor
workingPath="/home/brettonw/bin";
sensorFile="$workingPath/sensor.py";
if [ ! -e "$sensorFile" ]; then
  echo "No sensor is configured. The choices are:";
  find "$workingPath" -follow -name "sensor-*"  -printf '    %P\n' | sed -e "s/sensor-//" | sed -e "s/.py$//";
  read -p "Which sensor would you like to use? " sensorName;

  targetSensor="$workingPath/sensor-$sensorName.py";
  if [ -e "$targetSensor" ]; then
    ln -s "$targetSensor" "$sensorFile";
  fi
fi

if [ -e "$sensorFile" ]; then
  # copy the service file to the lib directory and start it
  serviceName="get-sensor.service";
  sudo systemctl stop "$serviceName";
  sudo cp "$workingPath/$serviceName" "/lib/systemd/system/"
  sudo systemctl enable "$serviceName";
  sudo systemctl start "$serviceName";
fi
