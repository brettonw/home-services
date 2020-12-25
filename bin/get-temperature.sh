# /usr/bin/env bash

# define a logging function
echoerr() { echo "$@" 1>&2; }

# setup the log file
targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/raw" ]; then
  mkdir -p "$targetDir/raw";
fi
rawFile="$targetDir/raw/temperature.raw";
jsonFile="$targetDir/temperature.json";

# setup the script start time and the counter
starttimestamp=$(date +%s%3N);
counter=0;

while :
do
    # get the temperature with the timestamp and write it to the raw log
    timestamp=$(date +%s%3N);
    temperature=$(cat /sys/class/thermal/thermal_zone0/temp);
    echo "    , { \"timestamp\": $timestamp, \"temperature\": $temperature }" >> $rawFile;

    # once per minute, go ahead and consolidate the JSON output
    counter=$(( counter + 1 ));
    if [ $counter -eq 6 ]; then
        # reset the counter
        counter=0;

        # limit the log output to 10G, about 1 day at every 10 seconds
        tail -c 10G $rawFile >  "$rawFile.tmp";
        mv "$rawFile.tmp" $rawFile;

        # concat everything into the JSON log, this is a bit ugly
        echo "[" > $jsonFile;
        echo "      { \"timestamp\": 0, \"temperature\": 0 }" >> $jsonFile;
        cat $rawFile >> $jsonFile;
        echo "]" >> $jsonFile;
    fi

    # sleep for a little bit (making the whole loop land on 10 second intervals)
    nowtimestamp=$(date +%s%3N);
    delta=$(( (10000-((nowtimestamp-starttimestamp) % 10000)) / 1000 ));
    if [ $delta -gt 0 ]; then
      sleep $delta;
      echoerr "sleeping for $delta seconds";
    fi;
done

