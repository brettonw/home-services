# /usr/bin/env bash

# define a logging function
echoerr() { echo "$@" 1>&2; }

# setup the log file
targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/raw" ]; then
  mkdir -p "$targetDir/raw";
fi
rawFile="$targetDir/raw/ping.raw";
jsonFile="$targetDir/ping.json";

# setup the script start time and the counter
startTimestamp=$(date +%s%3N);
counter=0;

while :
do
    # get the temperature with the timestamp and write it to the raw log
    timestamp=$(date +%s%3N);
    roundTrip=$(ping -c 5 1.1.1.1 | grep "min/avg/max/mdev");
    case ${roundTrip+x$roundTrip} in
        (x*[![:space:]]*) roundTrip=$(echo $roundTrip | awk '{split($0,a," "); print a[4]}');;
        (*) roundTrip="1000/1000/1000";
    esac
    echo "    , { \"timestamp\": $timestamp, \"roundTrip\": \"$roundTrip\" }" >> $rawFile;

    # increment the counter, then once per minute consolidate the JSON output
    counter=$(( counter + 1 ));
    modulo=$(( counter % 6));
    if [ $modulo -eq 0 ]; then
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
    targetTimestamp=$(( startTimestamp+(counter*10000) ));
    nowTimestamp=$(date +%s%3N);
    delta=$(( (targetTimestamp-nowTimestamp)/1000 ));
    if [ $delta -gt 0 ]; then
      echoerr "sleeping for $delta seconds";
      sleep $delta;
    else
      echoerr "PROBLEM: not sleeping ($delta ms)";
    fi;
done

