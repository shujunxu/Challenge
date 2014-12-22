var Async = require('async');

var CountAggregator = require('./aggregators/count');
var DataStore = require('./data_store');
var SumAggregator = require('./aggregators/sum');

var AGGREGATION_INTERVAL = 1 * 1000; // 1 second
var AGGREGATE_KEY_PREFIX = "1s";

var Manager = function () {
    this.dataStore = new DataStore();
};

Manager.prototype.getAggregatorClass = function (metric) {
    if (/.+_count$/.test(metric)) {
        return CountAggregator;
    } else if (/.+_sum$/.test(metric)) {
        return SumAggregator;
    } else {
        return undefined;
    }
};

Manager.prototype.addEvent = function (metric, value, timestamp, callback) {
    var self = this;

    var aggregatorClass = self.getAggregatorClass(metric);

    if (!aggregatorClass) {
        return callback(new Error("Unknown metric type: " + metric));
    }

    var clippedTime = timestamp - (timestamp % AGGREGATION_INTERVAL);

    // Get one second value for given metric from redis
    self.dataStore.getObject(metric, AGGREGATE_KEY_PREFIX + ':' + clippedTime, null, function (err, existingAggregate) {
        if (err) {
            return callback(err);
        }

        // merge existing value over that one second 
        var partialAggregate = aggregatorClass.aggregate([value]);
        var newTotalAggregate = aggregatorClass.merge([existingAggregate, partialAggregate]);

        //write merged value for that metric over one second
        return self.dataStore.setObject(metric, AGGREGATE_KEY_PREFIX + ':' + clippedTime, newTotalAggregate, callback);
    });
};

Manager.prototype.getMeasureForInterval = function (metric, start, end, callback) {
    var self = this;

    var aggregatorClass = self.getAggregatorClass(metric);

    if (!aggregatorClass) {
        return callback(new Error("Unknown metric type: " + metric));
    }

    // Clip the range boundaries to match our aggregation interval
    var clippedStartTime = start - (start % AGGREGATION_INTERVAL);
    var clippedEndTime = end - (end % AGGREGATION_INTERVAL);

    // Compute all start times we need
    var fetchStarts = [];
    var fetchStart = clippedStartTime;
    while (fetchStart <= clippedEndTime) {
        fetchStarts.push(fetchStart);
        fetchStart += AGGREGATION_INTERVAL;
    }

    Async.mapSeries(fetchStarts,
        function (timeFrameStart, callback) {
            return self.dataStore.getObject(metric, AGGREGATE_KEY_PREFIX + ':' + timeFrameStart, null, callback);
        },
        function (err, results) {
            if (err) {
                return callback(err);
            }

            return callback(null, aggregatorClass.merge(results));
        }
    );
};

module.exports = Manager;
