#!/usr/bin/env node

var Async = require('async');
var Commander = require('commander');
var Request = require('request');

Commander
    .version('0.0.1')
    .option('-c, --concurrency <number>', 'How many concurrent values to insert', 2)
    .option('-m, --metrics <number>', 'How many different metrics to insert', 2)
    .parse(process.argv);

var concurrency = parseInt(Commander.concurrency, 10);
var numMetrics = parseInt(Commander.metrics, 10);


var METRIC_SUFFIXES = ['_count', '_sum'];

var numEventsSent = 0;

for (var x = 0; x < concurrency; x += 1) {
    Async.forever(function (next) {
        var value = Math.random() * 1e6;
        var metricNumber = Math.floor(Math.random() * METRIC_SUFFIXES.length);
        var suffix = METRIC_SUFFIXES[metricNumber];
        var metric = "metric" + metricNumber + suffix;

        Request.post({
            url: 'http://localhost:8080/value',
            qs: {
                metric: metric,
                value: value,
                ts: Date.now()
            },
            headers: {
                'Connection': 'close'
            }
        },function (err) {
            if (!err) {
                numEventsSent += 1;
            }
            return next(err);
        });
    }, function (err) {
        console.error("Error posting values: %s", err.message);
        process.exit(1);
    });
}

var lastCheckTimestamp = Date.now();
var eventCountAtLastCheck = numEventsSent;
setInterval(function () {
    var now = Date.now();
    var timeDelta = now - lastCheckTimestamp;
    var eventDelta = numEventsSent - eventCountAtLastCheck;

    console.log("Sending %d events/s", Math.floor(eventDelta / timeDelta * 1000));

    lastCheckTimestamp = now;
    eventCountAtLastCheck = numEventsSent;
}, 1000);
