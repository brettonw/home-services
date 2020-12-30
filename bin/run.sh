# /usr/bin/env bash

targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/out" ]; then
  mkdir -p "$targetDir/out";
fi
nohup $targetDir/bin/get-temperature.sh > $targetDir/out/get-temperature.sh.out 2>&1 &
nohup $targetDir/bin/get-ping.sh 68.87.168.53 > $targetDir/out/get-ping-68.87.168.53.out 2>&1 &
nohup $targetDir/bin/get-ping.sh 96.120.104.221 > $targetDir/out/get-ping-96.120.104.221.out 2>&1 &
ps -ef | grep "get-" | grep -v "grep"
