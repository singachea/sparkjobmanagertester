'strict';
let rp = require('request-promise');
let config = require('./config');
let ops = require('./ops');
let _ = require('lodash');
let bb = require('bluebird');

let SDC = require('statsd-client');

let sdc = new SDC({prefix: 'sjmtester.metrics' , host: config.statsd.host, port: config.statsd.port});


function run() {
    ops.getStatistics().then(r => {
        sdc.gauge("activeJobsCount", r.activeJobsCount);
        sdc.gauge("activeContextsCount", r.activeContextsCount);
        sdc.gauge("agentActorsCount", r.agentActorsCount);
        sdc.gauge("activeLocksCount", r.activeLocksCount);
        sdc.gauge("creatingContextRequestsQueue", r.creatingContextRequestsQueue);
        sdc.gauge("awaitingContextRequests", r.awaitingContextRequests);
    }).catch(err => {
        console.log(err)
        console.log('crap cannot get statistic')
    })
}


setInterval(run, 1000);
