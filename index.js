"use strict;"

const temperatureDataSourceUrl = "temperature.json";

let computeColor = function (value, min, max) {
    let sq = function (x) { return Math.sqrt (x); };
    let interpolant = (value - min) / (max - min);
    interpolant = Math.min (1, Math.max (0, interpolant));
    let rValue = Math.floor (255 * ((interpolant < 0.5) ? sq (interpolant * 2) : 1));
    let gValue = Math.floor (255 * ((interpolant > 0.5) ? sq(1 - ((interpolant * 2) - 1)) : 1));
    return "rgb(" + rValue + "," + gValue + ",0)";
};

let makeScale = function () {
    let element = document.getElementById("scaleBar");
    let height = element.clientHeight / element.clientWidth;
    let builder = Bedrock.Html.Builder.begin ("http://www.w3.org/2000/svg;svg", { attributes: { width: "100%", height: "100%", viewBox: "0 0 1 " + height },  style: { margin: "0", display: "block" } });
    const divisions = 50;
    let scale = 1 / divisions;
    for (let i = 0; i < divisions; ++i) {
        builder.add ("http://www.w3.org/2000/svg;rect", { attributes: { x: i * scale, y: 0, width: scale, height: height, fill: computeColor (i * scale, 0, 1) } });
    }
    document.getElementById("scaleBar").appendChild(builder.end ());
};
makeScale ();

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
    let nowDate = new Date (nowTime);
    document.getElementById("div-time").innerText = nowDate.toLocaleDateString() + " " + nowDate.toLocaleTimeString();

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

    let makeWheel = function (value, min, max) {
        value = Math.round (value * 10) / 10;
        let v1 = Math.floor (value);
        let v2 = Math.floor ((value - v1) * 10);
        // determined roughly by experimentation
        const v1CharWidth = 1 / 2.75;
        const v2CharWidth = (1 / 4.5);
        const v2CharSpacing = 0.05;
        let overallWidth = (v1CharWidth * v1.toString ().length) + 1.25 * (v2CharSpacing + v2CharWidth);
        let right = (overallWidth / 2) - (v2CharSpacing + v2CharWidth);
        let radius = 0.95;

        // compute the color of the ring
        let color = computeColor (value, min, max);
        return Bedrock.Html.Builder
            .begin("div", { style: { width: "100%", margin: "0" } })
                .begin ("http://www.w3.org/2000/svg;svg", { attributes: { width: "100%", viewBox: "-1 -1 2 2" },  style: { margin: "0", display: "block" } })
                    .add ("http://www.w3.org/2000/svg;circle", { attributes: { cx: 0, cy: 0, r: radius, stroke: "#444", "stroke-width": 0.025, fill: color } })
                    .add ("http://www.w3.org/2000/svg;circle", { attributes: { cx: 0, cy: 0, r: radius * 0.8, stroke: "#444", "stroke-width": 0.025, fill: "white" } })
                    .add ("http://www.w3.org/2000/svg;text", { attributes: { x: right, y: -0.25, fill: "black", "font-family": "tahoma", "font-size": 0.65, "text-anchor": "end", "dominant-baseline": "hanging" }, innerHTML: v1 })
                    .add ("http://www.w3.org/2000/svg;text", { attributes: { x: right + v2CharSpacing, y: -0.25, fill: "black", "font-family": "tahoma", "font-size": 0.4, "text-anchor": "start", "dominant-baseline": "hanging" }, innerHTML: v2 })
                .end ()
            .end ();
    };

    let makePingChart = function (sourceUrls, chartElementId, wheelElementId) {
        let dataSets = [];
        let legend = [];
        let pingColors = [];
        let pingWheels = [];

        let wheelDivElement = document.getElementById("plot-ping-wheel");
        wheelDivElement.innerHTML = "";

        let asyncGatherChart = function (sourceUrlIndex) {
            if (sourceUrls.length > sourceUrlIndex) {
                Bedrock.Http.get(sourceUrls[sourceUrlIndex], (response) => {
                    // the first element is always (0, 0)
                    let info = response.shift();
                    if (response.length > 0) {
                        // the times need to be expressed as minutes ago, so we start by reversing the
                        // input data to make the first sample be the latest one
                        response.reverse();

                        // make a ping wheel
                        pingWheels.push(makeWheel(response[0].roundTrip.split("/")[1], 10, 80));

                        // loop over all of the source sets
                        for (let source of splitSource(response)) {
                            // only push a legend entry once
                            legend.push(info.target);
                            pingColors.push(colors[sourceUrlIndex % colors.length]);
                            info.target = "";

                            // loop over all the data to add them to the dataSets
                            let dataSet = digestSource(source.map(a => ({
                                timestamp: a.timestamp,
                                avg: a.roundTrip.split("/")[1]
                            })), "avg");
                            if (dataSet.length > 0) {
                                dataSets.push(dataSet);
                            }
                        }

                        // recur until we've read all the sources
                        asyncGatherChart(sourceUrlIndex + 1);
                    }
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

                // add the graph
                document.getElementById(chartElementId).innerHTML = svg;

                // add the wheels in reverse order
                pingWheels.reverse ().forEach( pingWheel => wheelDivElement.appendChild(pingWheel) )
            }
        };
        asyncGatherChart(0);
    };
    makePingChart(["ping-96.120.104.221.json", "ping-1.1.1.1.json"], "plot-ping-chart", "plot-ping-wheel");


    Bedrock.Http.get(temperatureDataSourceUrl, (response) => {
        // the first element is always (0, 0)
        response.shift ();

        // the times need to be expressed as minutes ago, so we start by reversing the
        // input data to make the first sample be the latest one
        response.reverse ();
        if (response.length > 0) {

            // create the temperature wheel element
            let wheelDivElement = document.getElementById("plot-temperature-wheel");
            wheelDivElement.innerHTML = "";
            wheelDivElement.appendChild(makeWheel(response[0].temperature / 1000, 45, 85));

            // create the data set to display
            let sources = splitSource(response);
            let dataSets = [];

            // loop over all of the source sets
            for (let source of sources) {
                let dataSet = digestSource(source, "temperature");
                if (dataSet.length > 0) {
                    dataSets.push(dataSet.map(a => ({x: a.x, y: a.y / 1000})));
                }
            }

            // add two data sets to set a range
            dataSets.push([{x: 0, y: 48}]);
            dataSets.push([{x: 0, y: 62}]);

            // create the actual plot
            let svg = PlotSvg
                .setColors(colors)
                .setPlotPoints(false)
                .multipleLine("System Temperature", "Time (minutes ago)", "Temperature (°C)", dataSets);

            // add the graph
            document.getElementById("plot-temperature-chart").innerHTML = svg;
        }
    });

    // refresh at the beginning of every minute
    var now = new Date();
    var delay = 60 * 1000;
    var start = delay - (now.getSeconds()) * 1000 + now.getMilliseconds();

    setTimeout(refresh, start);
}

refresh ();

