# /usr/bin/env bash

# define a logging function
echoerr() { echo "$@" 1>&2; }

# setup the log file, dropped directly in the web server path
targetDir="/var/www/html";
if [ ! -d "$targetDir/raw" ]; then
  mkdir -p "$targetDir/raw";
fi
rawHistoryFile="$targetDir/raw/sensor-history.raw";
jsonHistoryFile="$targetDir/sensor-history.json";
jsonNowFile="$targetDir/sensor-now.json";

# setup the script start time and the counter
startTimestamp=$(date +%s%3N);
counter=0;

while :
do
    # get the sensor with the timestamp and write it to the raw log
    # source data is like (note that not all sensors sense all values, and will
    # set the value to "-" to indicate "no information"):
    # temperature/relative humidity/pressure
    timestamp=$(date +%s%3N);
    sensorRead=$(/home/brettonw/bin/sensor.py);
    temperature=$(echo sensorRead | awk '{split($0,a,"/"); print a[1]}');
    humidity=$(echo sensorRead | awk '{split($0,a,"/"); print a[2]}');
    pressure=$(echo sensorRead | awk '{split($0,a,"/"); print a[3]}');
    sensorNow="{ \"timestamp\": $timestamp, \"temperature\": \"$temperature\", \"humidity\": \"$humidity\", \"pressure\": \"$pressure\" }";
    echo "    , $sensorNow" >> $rawHistoryFile;
    echo "$sensorNow" > $jsonNowFile;

    # increment the counter, then once per minute consolidate the JSON output
    counter=$(( counter + 1 ));
    modulo=$(( counter % 6));
    if [ $modulo -eq 0 ]; then
        # limit the log output to 10G, about 1 day at every 10 seconds
        tail --lines 10K $rawHistoryFile > "$rawHistoryFile.tmp";
        mv "$rawHistoryFile.tmp" $rawHistoryFile;

        # concat everything into the JSON log, this is a bit ugly
        echo "[" > $jsonHistoryFile;
        echo "      { \"timestamp\": 0, \"temperature\": 0 }" >> $jsonHistoryFile;
        cat $rawHistoryFile >> $jsonHistoryFile;
        echo "]" >> $jsonHistoryFile;
    fi

    # sleep for a little bit (making the whole loop land on 10 second intervals)
    targetTimestamp=$(( startTimestamp+(counter*10000) ));
    nowTimestamp=$(date +%s%3N);
    delta=$(( (targetTimestamp-nowTimestamp)/1000 ));
    if [ $delta -gt 0 ]; then
      #echoerr "sleeping for $delta seconds";
      sleep $delta;
    else
      echoerr "PROBLEM: not sleeping ($delta ms)";
    fi;
done


