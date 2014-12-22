var Express = require('express');

var HttpServer = function (config) {
    this.manager = config.manager;

    var app = this.app = new Express();

    // Configure application routes
    app.post('/value', this.addEventHandler.bind(this));
    app.get('/measure', this.getMeasureForIntervalHandler.bind(this));

    // Configure error routes
    app.use(this.unknownRouteHandler.bind(this));
    app.use(this.genericErrorHandler.bind(this)); // Handles all other errors

    return this;
};

HttpServer.prototype.start = function (callback) {
    var self = this;

    var server = self.app.listen(8080, function () {
        console.info("Listening on HTTP 8080");

        self.netServer = server;

        return callback();
    });

    server.on('error', function (err) {
        console.error("Error listening on HTTP 8080: %s", err.message);
    });
};

HttpServer.prototype.addEventHandler = function (req, res, next) {
    var self = this;

    var metric = req.query.metric;
    var value = JSON.parse(req.query.value);
    var timestamp = parseInt(req.query.ts, 10);

    self.manager.addEvent(metric, value, timestamp, function (err, newAggregate) {
        if (err) {
            return callback(err);
        }

        return self.writeResponse(req, res, 200, newAggregate);
    });
};

HttpServer.prototype.getMeasureForIntervalHandler = function (req, res, next) {
    var self = this;

    var metric = req.query.metric;
    var start = parseInt(req.query.start, 10);
    var end = parseInt(req.query.end, 10);

    self.manager.getMeasureForInterval(metric, start, end, function (err, result) {
        if (err) {
            return next(err);
        }

        return self.writeResponse(req, res, 200, result);
    });
};

HttpServer.prototype.unknownRouteHandler = function (req, res, next) {
    return this.writeResponse(req, res, 404, "Unknown route: " + req.originalUrl);
};

HttpServer.prototype.genericErrorHandler = function (err, req, res, next) {
    console.error('Uncaught exception', err.stack || err.message);

    return this.writeResponse(req, res, 500, err.name + ': ' + err.message);
};

HttpServer.prototype.writeResponse = function (req, res, statusCode, data) {
    statusCode = statusCode || 200;

    if (typeof data === 'object') {
        res.type('application/json');
        data = JSON.stringify(data, null, "    ");
    }

    if (statusCode >= 300 && statusCode < 500) {
        console.warn("HTTP %s %s ([%s] -> %s): %s", req.method, statusCode, req.connection.remoteAddress, req.originalUrl, data);
    } else if (statusCode >= 500) {
        console.error("HTTP %s %s ([%s] -> %s): %s", req.method, statusCode, req.connection.remoteAddress, req.originalUrl, data);
    } else {
        console.info("HTTP %s %s ([%s] -> %s)", req.method, statusCode, req.connection.remoteAddress, req.originalUrl);
    }

    return res.send(statusCode, data + "\n");
};

module.exports = HttpServer;
