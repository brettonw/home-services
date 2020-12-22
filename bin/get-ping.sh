# /usr/bin/env bash

# setup the log file
targetDir="/var/lib/tomcat9/webapps/home-services";
if [ ! -d "$targetDir/raw" ]; then
  mkdir -p "$targetDir/raw";
fi
rawFile="$targetDir/raw/ping.raw";
jsonFile="$targetDir/ping.json";

counter=0;

while :
do
    # get the temperature with the timestamp and write it to the raw log
    roundTrip=$(ping -c 5 1.1.1.1 | grep "min/avg/max/mdev");
    case ${roundTrip+x$roundTrip} in
        (x*[![:space:]]*) roundTrip=$(echo $roundTrip | awk '{split($0,a," "); print a[4]}');;
        (*) roundTrip="0/0/0";
    esac

    timestamp=$(date +%s);
    echo "    , { \"timestamp\": $timestamp, \"roundTrip\": \"$roundTrip\" }" >> $rawFile;

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

    # sleep for a little bit
    sleep 10;
done

