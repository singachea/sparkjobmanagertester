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

function getJobById(jobId) {
    return rp({
        uri: `${config.context.host}/jobs/${jobId}`,
        method: 'GET',
        timeout: 600000,
        json: true
    }).catch(err => {
        console.log(`Error in getting job id ${jobId}`);
        return {}
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

function submitSingleJob(ctxName, jobType, bodyFunc) {
    if(!jobType) throw new Error("You need to provided `jobType`");


    var jobParam = config.job.params[jobType];

    var body = bodyFunc ? bodyFunc(jobParam) : jobParam.body();

    return rp({
        uri: `${config.job.host}/jobs`,
        method: 'POST',
        qs: {
            'context': ctxName,
            'job': jobParam.className
        },
        body: body,
        timeout: 600000,
        headers: {},
        json: true
    }).then(result => {
        var jobId = result.response;

        return {jobId: jobId, result_location: (body.extra || {}).result_location}
    })
}


function isJobSuccess(jid) {
    return getJobById(jid).then(result => {
        if(result.status == "RUNNING") return bb.delay(3000).then(() => {
            return isJobSuccess(jid)
        });

        return { success: result.status == "SUCCESS", result: result};
    })
}

function runSubCohortJobs(times, cName, result_location) {
    if(!result_location || !cName) throw new Error("result_location and context_name are needed!");
    
    return bb.all(_.map(_.range(times), () => {
        return submitSingleJob(cName, 'subCohortJob', jobParam => {
            return jobParam.body(result_location);
        });
    })).then(r => {
        var validJobs= _.filter(r, e => e);
        console.log(`Initiating Sub-Cohort for context ${cName}  [${validJobs.length} subcohorts]`);
        return bb.map(validJobs, e => { return isJobSuccess(e.jobId) })
    }).then(r => {
        console.log(`Sub-Cohort results for context ${cName}`, r);
        console.log(`Finished all sub cohort jobs for context ${cName}`);
    })
        .catch(error => {
        console.log(error);
        return [];
    });
}

module.exports = {
    getStatistics: getStatistics,
    getContextNames: getContextNames,
    getJobById: getJobById,
    deleteContextByName: deleteContextByName,
    deleteContextById: deleteContextById,
    createContextByName: createContextByName,
    createContextById: createContextById,
    submitJobByName: submitJobByName,
    submitJobById: submitJobById,
    submitSingleJob: submitSingleJob,
    isJobSuccess: isJobSuccess,
    runSubCohortJobs: runSubCohortJobs
};