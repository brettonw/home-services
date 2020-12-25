"use strict;"

const temperatureDataSourceUrl = "temperature.json";

let refresh = function () {
    // timestamps are in seconds or ms, but we always want ms
    let conditionTime = function (t) {
        // if t is in seconds, expand it to ms
        return (t < 1.e10) ? (t * 1e3) : t;
    };

    // compute the delta minutes between two timestamps
    const msToMinutes = 1 / (1000 * 60);
    let minutesDelta = function (t1, t2) {
        let deltaMs = Math.abs (conditionTime(t1) - conditionTime (t2));
        let deltaMinutes = deltaMs * msToMinutes;
        return deltaMinutes;
    };

    // a source data array might not have any data in it for some time periods, for
    // instance if the server was offline during the data collection. we split such an
    // array into multiple arrays rather than try to correlate them
    let splitSource = function (source) {
        // the expected gap is about 10 seconds, so we will look for gaps bigger than
        // 15 seconds, or 0.25 minutes
        let maxGap = 0.25;
        let sources = [];

        let start = 0;
        for (let i = 1; i < source.length; ++i) {
            if (minutesDelta(source[i].timestamp, source[i - 1].timestamp) > maxGap) {
                sources.push (source.slice (start, i));
                start = i;
            }
        }
        sources.push (source.slice (start, source.length));

        // return the result
        return sources;
    };

    // all of our samples are being conducted in 10 second intervals
    const responsesPerMinute = 6;
    const graphHours = 3;
    const graphMinutes = graphHours * 60;

    // set plot colors to repeat correctly
    let colors = ["rgb(114,147,203)", "rgb(132,186,91)", "rgb(225,151,76)"];

    let nowTime = Date.now(); //response[0].timestamp;

    let digestSource = function (source, key) {
        let dataSet = [];

        // trim the source to be only full minutes in length
        source.length -= source.length % responsesPerMinute;

        // loop over the array in minute long chunks
        for (let i = 0, end = Math.min(source.length / responsesPerMinute, graphMinutes); i < end; ++i) {
            let offset = i * responsesPerMinute;
            let minute = source.slice(offset, offset + responsesPerMinute);
            let average = minute.reduce(function (total, current) {
                return {
                    x: total.x + (minutesDelta(current.timestamp, nowTime) / responsesPerMinute),
                    y: total.y + (current[key] / responsesPerMinute)
                }
            }, {x: 0, y: 0});
            if (average.x < graphMinutes) {
                dataSet.push(average);
            } else {
                break;
            }
        }

        return dataSet;
    };

    let makePingChart = function (sourceUrls, elementId) {
        let dataSets = [];
        let legend = [];
        let pingColors = [];

        let asyncGatherChart = function (sourceUrlIndex) {
            if (sourceUrls.length > sourceUrlIndex) {
                Bedrock.Http.get(sourceUrls[sourceUrlIndex], (response) => {
                    // the first element is always (0, 0)
                    let info = response.shift();

                    // the times need to be expressed as minutes ago, so we start by reversing the
                    // input data to make the first sample be the latest one
                    response.reverse();

                    // loop over all of the source sets
                    for (let source of splitSource(response)) {
                        // only push a legend entry once
                        legend.push (info.target);
                        pingColors.push (colors[sourceUrlIndex % colors.length]);
                        info.target = "";

                        // loop over all the data to add them to the dataSets
                        let dataSet = digestSource (source.map ( a => ({ timestamp: a.timestamp, avg: a.roundTrip.split("/")[1] }) ), "avg");
                        if (dataSet.length > 0) {
                            dataSets.push (dataSet);
                        }
                    }

                    // recur until we've read all the sources
                    asyncGatherChart(sourceUrlIndex + 1);
                });
            } else {
                // add two data sets to set a nominal range
                dataSets.push([{x: 0, y: 0}]);
                dataSets.push([{x: 0, y: 40}]);

                // create the actual plot
                let svg = PlotSvg
                    .setColors (pingColors)
                    .setPlotPoints(false)
                    .setLegendPosition(480, 360)
                    .multipleLine("Ping", "Time (minutes ago)", "Round Trip (ms)", dataSets, legend);

                // size the display element, the graph itself has aspect 4:3
                let divElement = document.getElementById(elementId);
                divElement.style.height = (divElement.offsetWidth * 3 / 5) + "px";
                divElement.innerHTML = svg;
            }
        };
        asyncGatherChart(0);
    };
    makePingChart(["ping-96.120.104.221.json", "ping-1.1.1.1.json"], "plot-ping");


    Bedrock.Http.get(temperatureDataSourceUrl, (response) => {
        // the first element is always (0, 0)
        response.shift ();

        // the times need to be expressed as minutes ago, so we start by reversing the
        // input data to make the first sample be the latest one
        response.reverse ();

        // create the data set to display
        let sources = splitSource (response);
        let dataSets = [];

        // loop over all of the source sets
        for (let source of sources) {
            let dataSet = digestSource (source, "temperature");
            if (dataSet.length > 0) {
                dataSets.push (dataSet.map (a => ({ x: a.x, y: a.y / 1000 })));
            }
        }

        // add two data sets to set a range
        dataSets.push ([{ x: 0, y: 48}]);
        dataSets.push ([{ x: 0, y: 62}]);

        // create the actual plot
        let svg = PlotSvg
            .setColors (colors)
            .setPlotPoints (false)
            .multipleLine("System Temperature", "Time (minutes ago)", "Temperature (°C)", dataSets);

        // size the display element, the graph itself has aspect 4:3
        let divElement = document.getElementById("plot-temperature");
        divElement.style.height = (divElement.offsetWidth * 3 / 5) + "px";
        divElement.innerHTML = svg;
    });

    // refresh at the beginning of every minute
    var now = new Date();
    var delay = 60 * 1000;
    var start = delay - (now.getSeconds()) * 1000 + now.getMilliseconds();

    setTimeout(refresh, start);
}

refresh ();

