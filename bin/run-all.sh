#! /usr/bin/env bash

# infinitude
docker pull nebulous/infinitude;
echo;

docker ps | grep "infinitude-1" &> /dev/null;
if [ $? == 0 ]; then
    echo "stopping infinitude-1...";
    docker stop "infinitude-1" &> /dev/null;
fi
echo "starting infinitude-1";
docker run -d --name "infinitude-1" --rm -v /home/brettonw/infinitude/1:/infinitude/state -p 3001:3000 nebulous/infinitude;
echo;

docker ps | grep "infinitude-2" &> /dev/null;
if [ $? == 0 ]; then
    echo "stopping infinitude-2...";
    docker stop "infinitude-2" &> /dev/null;
fi
echo "starting infinitude-2";
docker run -d --name "infinitude-2" --rm -v /home/brettonw/infinitude/2:/infinitude/state -p 3002:3000 nebulous/infinitude;
echo;

# home assistant
docker pull homeassistant/raspberrypi4-homeassistant:stable;
echo

docker ps | grep "home-assistant" &> /dev/null;
if [ $? == 0 ]; then
    echo "stopping home-assistant...";
    docker stop "home-assistant" &> /dev/null;
fi
echo "starting home-assistant";
docker run --init -d --name="home-assistant" --rm -e "TZ=America/New_York" -v /home/brettonw/home-assistant/:/config --net=host homeassistant/raspberrypi4-homeassistant:stable;
echo;

# clean up after docker
echo "cleaning up docker...";
docker image prune -a --force --filter "until=24h";
echo;

# home services
pushd ~/tomcat/webapps/home-services;
echo "synching home-services...";
git pull;
echo;
bin/run.sh;
popd;
