'strict';
let rp = require('request-promise');
let config = require('./config');
let ops = require('./ops');
let _ = require('lodash');
let bb = require('bluebird');

let SDC = require('statsd-client');

let sdc = new SDC({prefix: 'sjmtester' , host: config.statsd.host, port: config.statsd.port});

let winston = require('winston');
winston.add(winston.transports.File, { filename: 'logs/creating_context.log' });

let logger = winston;

let autoDeleteContext = process.argv[2] == "true";
let contextSize = process.argv[3] || config.context.contextSize;
let tick = process.argv[4] || config.context.defaultTick;
let requestInterval = process.argv[5] || config.context.interval;
let creatingChance = process.argv[6] || config.context.contextCreationChance;
let jobsPerContext = process.argv[7] || config.context.jobsPerContext;
let createSubcohortJobsAfterCohortJob = process.argv[8] || false;
let subcohortJobsPerCohortJob = process.argv[9] || config.context.subcohortJobsPerCohortJob;


let requestingContextPool = [];
let activeContextPool = [];

let oldRequestingContextPoolLength = -1;
let oldActiveContextPoolLength = -1;

let gSubmittedJobs = 0;
let gFailedJobs = 0;

console.log("contextSize", contextSize);
console.log("starting tick", tick);
console.log("creatingChance", creatingChance);
console.log("requestInterval", requestInterval);
console.log("jobsPerContext", jobsPerContext);
console.log("-----------------------------------------------");



function removeContextIdFromPools(ctxId) {
    _.remove(requestingContextPool, e => e == ctxId);
    _.remove(activeContextPool, e => e == ctxId);
}

function createContext(ctxId) {

    var measuredCreationTime = `Context Creation ${ctxId}`;
    console.time(measuredCreationTime);
    console.log(`Initiate context creation for ${ctxId}`);
    requestingContextPool.push(ctxId);

    return ops.createContextById(ctxId).then(result => {
        activeContextPool.push(ctxId);
        sdc.increment("contextRequestSuccess");
        console.log("Active Context Pool:", activeContextPool);
        return ctxId;
    }).catch( err => {
        sdc.increment("contextRequestFail");
        logger.error(err);
        console.log(`=========== ERROR for ${ctxId} =============`);
        if(err.response) console.log(err.response.body);
        else console.log(err);
        console.log(`============================================`);
        _.remove(requestingContextPool, e => e == ctxId)

    }).finally( () => {
        console.timeEnd(measuredCreationTime);
    });
}


function deleteContext() {
    if(activeContextPool.length <= 0) return;
    let ctxId = _.sample(activeContextPool);

    let measuredDeletionTime = `Context Deletion [${_.random(0, 1000)}] ${ctxId}`;
    console.time(measuredDeletionTime);


    return ops.deleteContextById(ctxId).then(result => {
        sdc.increment("deleteContextRequestSuccess");
        console.log('remove ctx' + ctxId);
        removeContextIdFromPools();
        console.log("Active Context Pool:", activeContextPool);
    }).catch(err => {
        sdc.increment("deleteContextRequestFail");
        logger.error(err);
        console.log("Can't remove context", ctxId);
        if(err.response) console.log(err.response.body);
        else console.log(err);
    }).finally(() => {
        console.timeEnd(measuredDeletionTime);
    })
}


function sequential(p, f) {
    return p.then(() => {
        return f()
    });
}

function requestJob(ctxId, index) {
    let tickIndex = 1 + index;
    let targetTime = `Job for context ${ctxId} [${tickIndex}]`;

    console.time(targetTime);
    console.log(`Submit job for context ${ctxId} [tick: ${tickIndex}]`);


    return ops.submitJobById(ctxId).then(result => {
        console.log(`Successful Submit job for context ${ctxId} [tick: ${tickIndex}]`);
        console.log(result);
        sdc.increment("jobSuccess");
        return result.response;
    }).catch(err => {
        console.log(`Failed submit job for context ${ctxId} [tick: ${tickIndex}]`);
        sdc.increment("jobFail");
        if(err.response) console.log(err.response.body);
        else console.log(err);
        return null;
    }).finally(() => {
        console.timeEnd(targetTime);
    });
}

function requestCohortJob(ctxId, index) {
    let tickIndex = 1 + index;
    let targetTime = `Job for context ${ctxId} [${tickIndex}]`;

    console.time(targetTime);
    console.log(`Submit job for context ${ctxId} [tick: ${tickIndex}]`);


    return ops.submitSingleJob(`ctx${ctxId}`, 'cohortJob').then(result => {
        console.log(`Successful Submit job for context ${ctxId} [tick: ${tickIndex}]`);
        console.log(result);
        sdc.increment("jobSuccess");
        return result;
    }).catch(err => {
        console.log(`Failed submit job for context ${ctxId} [tick: ${tickIndex}]`);
        sdc.increment("jobFail");
        if(err.response) console.log(err.response.body);
        else console.log(err);
        return null;
    }).finally(() => {
        console.timeEnd(targetTime);
    });
}


function queueJobs(ctxId, num) {
    var p = bb.resolve(null);
    var jobCount = 0;
    var failedJobCount = 0;
    
    if(config.job.runInParallel) {
        p = bb.all(_.map(_.range(0, num), index => {
            jobCount++;
            // return requestJob(ctxId, index);
            return requestCohortJob(ctxId, index);
        }));    
    }
    else {
        _.each(_.range(0, num), (index) => {
            p = sequential(p, () =>{
                jobCount++;
                return requestJob(ctxId, index);
            }).delay(10);
        });    
    }
    
    return p.then(result => {
            console.log(`queue all jobs for context ${ctxId}`, result);
            return _.filter(result, r => r != null);
        })
        .then(result => {
            if(!createSubcohortJobsAfterCohortJob) return result;

            return bb.all(_.map(result, job => {
                return ops.isJobSuccess(job.jobId).then(jobResult => {
                    if (jobResult.success) {
                        return ops.runSubCohortJobs(subcohortJobsPerCohortJob, `ctx${ctxId}`, job.result_location);
                    }
                    else {
                        console.log(`Something wrong with job ${job.jobId}`);
                        console.log(jobResult.result);
                        return bb.resolve(null);
                    }
                });

            })).then(subCohortResults => {
                console.log("waiting until sub cohort finish")
                console.log(subCohortResults)
            }); // waiting until each job finishes / fails
        })
        // .delay(config.context.timeoutToKillContext)
        .catch(err => {
            console.log(err);
            failedJobCount++;
            removeContextIdFromPools(ctxId);
        }).finally(() => {
            // remove context here
            return ops.deleteContextById(ctxId).then(dResult => {
                console.log(`removed context ${ctxId}: ${dResult}`);
                removeContextIdFromPools(ctxId);
            }).catch(err => {
                console.log(`can't remove context ${ctxId}`);
            })
        }).then(() => {
            return {submittedJobs: jobCount, failedJobs: failedJobCount};
        })
}


let run = function () {
    tick++;

    if(oldRequestingContextPoolLength != requestingContextPool.length || oldActiveContextPoolLength != activeContextPool.length) {
        console.log('created/creating pool', `${activeContextPool.length}/${requestingContextPool.length}`);
        oldRequestingContextPoolLength = requestingContextPool.length;
        oldActiveContextPoolLength = activeContextPool.length;
    }


    if(autoDeleteContext) {
        if(requestingContextPool.length >= contextSize) return; // max out
        createContext(tick).then((createdCtxId) =>{
            if(createdCtxId) {
                setTimeout(()=> {
                    queueJobs(createdCtxId, jobsPerContext).then(result => {
                        console.log('job result', result);
                        gSubmittedJobs += result.submittedJobs;
                        gFailedJobs += result.failedJobs;

                        console.log(`====> JOBS FAILED/TOTAL  ${gFailedJobs}/${gSubmittedJobs}`);
                    });
                }, 200);
            }
        });
    }
    else {
        if(Math.random() < creatingChance) {
            if(requestingContextPool.length >= contextSize) return; // max out
            createContext(tick);
        }
        else {
            deleteContext();
        }
    }
};


setInterval(run, requestInterval);




