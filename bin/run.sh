# /usr/bin/env bash

targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/out" ]; then
  mkdir -p "$targetDir/out";
fi
nohup $targetDir/bin/get-temperature.sh > $targetDir/out/get-temperature.sh.out 2>&1 &
nohup $targetDir/bin/get-ping.sh 1.1.1.1 > $targetDir/out/get-ping-1.1.1.1.out 2>&1 &
nohup $targetDir/bin/get-ping.sh 96.120.104.221 > $targetDir/out/get-ping-96.120.104.221.out 2>&1 &
