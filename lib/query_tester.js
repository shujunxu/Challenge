#!/usr/bin/env node

var Async = require('async');
var Commander = require('commander');
var Request = require('request');

Commander
    .version('0.0.1')
    .option('-c, --concurrency <number>', 'How many concurrent values to insert', 2)
    .option('-m, --metrics <number>', 'How many different metrics to insert', 2)
    .option('-w, --max-query-window <seconds>', 'The maximum query window size to use for queries', 3600)
    .parse(process.argv);

var concurrency = parseInt(Commander.concurrency, 10);
var numMetrics = parseInt(Commander.metrics, 10);
var maxQueryWindow = parseInt(Commander.maxQueryWindow, 10) * 1000;


var METRIC_SUFFIXES = ['_count', '_sum'];

var numQueriesSent = 0;

for (var x = 0; x < concurrency; x += 1) {
    Async.forever(function (next) {
        var value = Math.random() * 1e6;
        var metricNumber = Math.floor(Math.random() * METRIC_SUFFIXES.length);
        var suffix = METRIC_SUFFIXES[metricNumber];
        var metric = "metric" + metricNumber + suffix;
        var now = Date.now();
        var queryWindow = Math.floor(Math.random() * maxQueryWindow);
        var startTime = now - queryWindow;
        var endTime = now;

        Request.get({
            url: 'http://localhost:8080/measure',
            qs: {
                metric: metric,
                start: startTime,
                end: endTime
            },
            headers: {
                'Connection': 'close'
            }
        },function (err) {
            if (!err) {
                numQueriesSent += 1;
            }
            return next(err);
        });
    }, function (err) {
        console.error("Error posting values: %s", err.message);
        process.exit(1);
    });
}

var lastCheckTimestamp = Date.now();
var queryCountAtLastCheck = numQueriesSent;
setInterval(function () {
    var now = Date.now();
    var timeDelta = now - lastCheckTimestamp;
    var queryDelta = numQueriesSent - queryCountAtLastCheck;

    console.log("Issuing %d queries/s", Math.floor(queryDelta / timeDelta * 1000));

    lastCheckTimestamp = now;
    queryCountAtLastCheck = numQueriesSent;
}, 1000);
