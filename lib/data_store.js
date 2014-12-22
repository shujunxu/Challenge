var Redis = require('redis');

var DataStore = function () {
    var client = this.redisClient = Redis.createClient();

    client.on('error', function (err) {
        console.error("Error connecting to Redis", err.message);
    });
    client.on('end', function () {
        console.warn("Disconnected from Redis");
    });
    client.on('connect', function () {
        console.info("Connected to Redis");
    });
};

DataStore.prototype.getObject = function (prefix, key, defaultValue, callback) {
    this.redisClient.get(prefix + ':' + key, function (err, redisData) {
        if (err) {
            return callback(err);
        }

        var result = defaultValue;

        try {
            result = JSON.parse(redisData) || defaultValue;
        } catch (ex) {
            return callback(ex);
        }

        return callback(null, result);
    });
};

DataStore.prototype.setObject = function (prefix, key, value, callback) {
    return this.redisClient.set(prefix + ':' + key, JSON.stringify(value), function (err) {
        return callback(err, value);
    });
};

module.exports = DataStore;
