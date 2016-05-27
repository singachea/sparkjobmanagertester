'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');



function getStatistics() {
    return rp({
        uri: `${config.context.host}/status/metrics`,
        method: 'GET',
        timeout: 600000,
        json: true
    }).then(results => {
        if(results.length == 0) return {
            activeJobsCount: 0,
            activeContextsCount: 0,
            agentActorsCount: 0,
            activeLocksCount: 0,
            creatingContextRequestsQueue: 0,
            awaitingContextRequests: 0
        };

        var sup = results[0];
        var creatingContextRequestsQueue = _.sum(_.map(results, e => e.creatingContextRequestsQueue.length));
        var awaitingContextRequests = _.sum(_.map(results, e => e.awaitingContextRequests.length));

        return {
            activeJobsCount: sup.activeJobsCount,
            activeContextsCount: sup.activeContextsCount,
            agentActorsCount: sup.agentActorsCount,
            activeLocksCount: sup.activeLocksCount,
            creatingContextRequestsQueue: creatingContextRequestsQueue,
            awaitingContextRequests: awaitingContextRequests
        }

    })
}

function getContextNames() {
    return rp({
        uri: `${config.context.host}/contexts`,
        method: 'GET',
        timeout: 600000,
        json: true
    }).catch(err => {
        console.log("Error in get all contexts");
        return [];
    })
}

function deleteContextByName(name) {
    return rp({
        uri: `${config.context.host}/contexts/${name}`,
        method: 'DELETE',
        timeout: 600000,
        json: true
    });
}


function deleteContextById(ctxId) {
    return deleteContextByName(`ctx${ctxId}`);
}


function createContextByName(name) {
    return rp({
        uri: `${config.context.host}/contexts/${name}`,
        method: 'POST',
        qs: {
            'spark.driver.allowMultipleContexts': true,
            'context-factory': 'spark.jobserver.context.HiveContextFactory',
            'spark.mesos.coarse': true,
            'spark.cores.max': config.context.core,
            'spark.executor.memory': `${config.context.memory}g`
        },
        timeout: 600000,
        headers: {},
        json: true
    });
}

function createContextById(ctxId) {
    return createContextByName(`ctx${ctxId}`);
}


function submitJobByName(ctxName) {

    var jobParam = config.job.params[_.sample(config.job.jobTypes)];
    
    return rp({
        uri: `${config.job.host}/jobs`,
        method: 'POST',
        qs: {
            'context': ctxName,
            'job': jobParam.className
        },
        body: jobParam.body(),
        timeout: 600000,
        headers: {},
        json: true
    });
}

function submitJobById(ctxId) {
    return submitJobByName(`ctx${ctxId}`);
}


module.exports = {
    getStatistics: getStatistics,
    getContextNames: getContextNames,
    deleteContextByName: deleteContextByName,
    deleteContextById: deleteContextById,
    createContextByName: createContextByName,
    createContextById: createContextById,
    submitJobByName: submitJobByName,
    submitJobById: submitJobById
};