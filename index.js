"use strict;"

const  pingDataSourceUrl = "ping.json";
const temperatureDataSourceUrl = "temperature.json";

let refresh = function () {
    // a source data array might not have any data in it for some time periods, for
    // instance if the server was offline during the data collection. we split such an
    // array into multiple arrays rather than try to correlate them
    let splitSource = function (source) {
        // the expected gap is about 10 milliseconds, so we will look for gaps bigger than
        // 15 milliseconds, and fill them with a proto value
        let maxGap = 15;
        let sources = [];

        let start = 0;
        for (let i = 1; i < source.length; ++i) {
            if (Math.abs (source[i].timestamp - source[i - 1].timestamp) > maxGap) {
                sources.push (source.slice (start, i));
                start = i;
            }
        }

        // return the result
        return sources;
    };

    // timestamps are in seconds or ms, but we always want ms
    let conditionTime = function (t) {
        // if t is in seconds, expand it to ms
        return (t < 1.e10) ? (t * 1e3) : t;
    };

    const msToMinutes = 1 / (1000 * 60);
    let minutesDelta = function (t1, t2) {
        let deltaMs = Math.abs (conditionTime(t1) - conditionTime (t2));
        let deltaMinutes = deltaMs * msToMinutes;
        return deltaMinutes;
    };

    // all of our samples are being conducted in 10 second intervals
    const responsesPerMinute = 6;
    const graphHours = 3;
    const graphMinutes = graphHours * 60;

    Bedrock.Http.get(pingDataSourceUrl, (response) => {
        // the first element is always (0, 0)
        response.shift ();

        // the times need to be expressed as minutes ago, so we start by reversing the
        // input data to make the first sample be the latest one
        response.reverse ();
        let nowTime = response[0].timestamp;

        // create the data set to display
        let sources = splitSource (response);
        let dataSets = [];
        let legend = ["min", "avg", "max"];

        // loop over all of the source sets
        for (let source of sources) {
            if (minutesDelta(source[0].timestamp, nowTime) < graphMinutes) {
                let dataSetMin = [];
                let dataSetAvg = [];
                let dataSetMax = [];
                dataSets.push(dataSetMin, dataSetAvg, dataSetMax);

                for (let i = 0, end = Math.min(source.length / responsesPerMinute, graphMinutes); i < end; ++i) {
                    let offset = i * responsesPerMinute;
                    let minute = source.slice(offset, offset + responsesPerMinute);
                    let average = minute.reduce(function (total, current) {
                        let times = current.roundTrip.split("/");
                        return {
                            x: total.x + (minutesDelta(current.timestamp, nowTime) / responsesPerMinute),
                            min: total.min + (times[0] / responsesPerMinute),
                            avg: total.avg + (times[1] / responsesPerMinute),
                            max: total.max + (times[2] / responsesPerMinute)
                        };
                    }, {x: 0, min: 0, avg: 0, max: 0});
                    if (average.x < graphMinutes) {
                        dataSetMin.push({x: average.x, y: average.min});
                        dataSetAvg.push({x: average.x, y: average.avg});
                        dataSetMax.push({x: average.x, y: average.max});
                    }
                }
            }
        }
        let svg = PlotSvg.setPlotPoints(false).setLegendPosition(480, 380).multipleLine("Ping 1.1.1.1", "Time (minutes ago)", "Time (ms)", dataSets, legend);

        // size the display element, the graph itself has aspect 4:3
        let divElement = document.getElementById("plot-ping");
        divElement.style.height = (divElement.offsetWidth * 3 / 5) + "px";
        divElement.innerHTML = svg;
    });


    Bedrock.Http.get(temperatureDataSourceUrl, (response) => {
        // the first element is always (0, 0)
        response.shift ();

        // the times need to be expressed as minutes ago, so we start by reversing the
        // input data to make the first sample be the latest one
        response.reverse ();
        let nowTime = response[0].timestamp;

        // create the data set to display
        let sources = splitSource (response);
        let dataSets = [];

        // add two data sets to set a range
        dataSets.push ([{ x: 0, y: 46}]);
        dataSets.push ([{ x: 0, y: 52}]);

        // loop over all of the source sets
        for (let source of sources) {
            if (minutesDelta(source[0].timestamp, nowTime) < graphMinutes) {
                let dataSet = [];
                dataSets.push(dataSet);

                // trim the source to be only full minutes in length
                source.length -= source.length % responsesPerMinute;

                // loop over the array in minute long chunks
                for (let i = 0, end = Math.min(source.length / responsesPerMinute, graphMinutes); i < end; ++i) {
                    let offset = i * responsesPerMinute;
                    let minute = source.slice(offset, offset + responsesPerMinute);
                    let average = minute.reduce(function (total, current) {
                        return {
                            x: total.x + (minutesDelta(current.timestamp, nowTime) / responsesPerMinute),
                            y: total.y + (current.temperature / (1.0e3 * responsesPerMinute))
                        }
                    }, {x: 0, y: 0});
                    if (average.x < graphMinutes) {
                        dataSet.push(average);
                    }
                }
            }
        }
        let svg = PlotSvg.setPlotPoints (false).multipleLine("System Temperature", "Time (Minutes Ago)", "Temperature (Celsius)", dataSets);

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

