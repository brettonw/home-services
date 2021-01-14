# /usr/bin/env bash

# make sure the output dir is there, and set the stage for where we run from
targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/out" ]; then
  mkdir -p "$targetDir/out";
fi

# function to terminate and restart a process and report the results
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

# restart the monitor procs
restartProc "get-temperature.sh";
restartProc "get-ping.sh 68.87.168.53";
restartProc "get-ping.sh 96.120.104.221";
