"use strict;"

let pingDataSourceUrl = "ping.json";

Bedrock.Http.get(pingDataSourceUrl, (response) => {
    // the first element is always (0, 0)
    response.shift ();

    // create the data set array to display
    let dataSetMin = [];
    let dataSetAvg = [];
    let dataSetMax = [];
    let dataSetArray = [dataSetMin, dataSetAvg, dataSetMax];

    // the times need to be expressed as minutes ago, and averaged per minute. we trim the
    // array to be only whole minutes
    response.reverse ();
    const responsesPerMinute = 6;
    const graphHours = 2;
    const graphMinutes = graphHours * 60;
    response.length -= response.length % responsesPerMinute;
    for (let i = 0, end = Math.min (response.length / responsesPerMinute, graphMinutes); i < end; ++i) {
        let offset = i * responsesPerMinute;
        let minute = response.slice (offset, offset + responsesPerMinute);
        let average = minute.reduce (function (total, current) {
            let times = current.roundTrip.split ("/");
            return {
                min: total.min + (times[0] / responsesPerMinute),
                avg: total.avg + (times[1] / responsesPerMinute),
                max: total.max + (times[2] / responsesPerMinute)
            };
        }, {min: 0, avg: 0, max: 0});
        dataSetMin.push ({ x: i, y: average.min });
        dataSetAvg.push ({ x: i, y: average.avg });
        dataSetMax.push ({ x: i, y: average.max });
    }

    let svg = PlotSvg.setPlotPoints (false).setLegendPosition(440, 340).multipleLine("Ping 1.1.1.1", "Time (minutes ago)", "Time (ms)", dataSetArray, ["min", "avg", "max"]);

    // size the display element, the graph itself has aspect 4:3
    let divElement = document.getElementById("plot-ping");
    divElement.style.height = (divElement.offsetWidth * 3 / 5) + "px";
    divElement.innerHTML = svg;
});

let temperatureDataSourceUrl = "temperature.json";

Bedrock.Http.get(temperatureDataSourceUrl, (response) => {
    // the first element is always (0, 0)
    response.shift ();

    // create the data set to display
    let dataSet = [];

    // the times need to be expressed as minutes ago, and averaged per minute. we trim the
    // array to be only whole minutes
    response.reverse ();
    const responsesPerMinute = 6;
    const graphHours = 2;
    const graphMinutes = graphHours * 60;
    response.length -= response.length % responsesPerMinute;
    for (let i = 0, end = Math.min (response.length / responsesPerMinute, graphMinutes); i < end; ++i) {
        let offset = i * responsesPerMinute;
        let minute = response.slice (offset, offset + responsesPerMinute);
        let average = minute.reduce (function (total, current) { return total + (current.temperature / (1.0e3 * responsesPerMinute)); }, 0);
        dataSet.push ({ x: i, y: average });
    }

    let svg = PlotSvg.setPlotPoints (false).singleLine("System Temperature", "Time (Minutes Ago)", "Temperature (Celsius)", dataSet);

    // size the display element, the graph itself has aspect 4:3
    let divElement = document.getElementById("plot-temperature");
    divElement.style.height = (divElement.offsetWidth * 3 / 5) + "px";
    divElement.innerHTML = svg;
});

