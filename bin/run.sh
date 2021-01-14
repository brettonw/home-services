# /usr/bin/env bash

targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/out" ]; then
  mkdir -p "$targetDir/out";
fi


function restartProc () {
  local command=$1;
  local pid=$(ps -e -f -opid,command | grep "$command" | grep -v "grep" | head | awk '{ print $1; exit }');
  if [ ! -z "$pid" ]; then
    echo "Terminating $command ($pid)";
    kill -9 $pid;
  fi
  local outputname="$targetDir/out/${command// /_}.out";
  echo "Starting $command > $outputname";
  nohup $targetDir/bin/$command > $outputname 2>&1 &
  pid=$(ps -e -f -opid,command | grep "$command" | grep -v "grep" | head | awk '{ print $1; exit }');
  if [ ! -z "$pid" ]; then
    echo "Started $command ($pid)";
  else
    echo "Failed to start $command";
  fi
  echo;
}

restartProc "get-temperature.sh";
restartProc "get-ping.sh 68.87.168.53";
restartProc "get-ping.sh 96.120.104.221";
