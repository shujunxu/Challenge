#!/usr/bin/env node

var Manager = require('./manager');
var HttpServer = require('./http_server');

var manager = new Manager();
var httpServer = new HttpServer({
    manager: manager
});

httpServer.start(function () {
    console.info("Server is ready to go");
});
