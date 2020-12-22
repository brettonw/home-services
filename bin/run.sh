# /usr/bin/env bash

targetDir="/var/lib/tomcat9/webapps/home-services";
mkdir "$targetDir/out";
nohup $targetDir/bin/get-temperature.sh > $targetDir/out/get-temperature.sh.out 2>&1 &
nohup $targetDir/bin/get-ping.sh > $targetDir/out/get-ping.sh.out 2>&1 &
