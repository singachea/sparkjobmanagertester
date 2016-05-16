'strict';
let rp = require('request-promise');
let config = require('./config');
let ops = require('./ops');
let _ = require('lodash');
let bb = require('bluebird');

let winston = require('winston');
winston.add(winston.transports.File, { filename: 'logs/creating_context.log' });

let logger = winston;

let autoDeleteContext = process.argv[2] == "true";
let contextSize = process.argv[3] || config.context.contextSize;
let tick = process.argv[4] || config.context.defaultTick;
let requestInterval = process.argv[5] || config.context.interval;
let creatingChance = process.argv[6] || config.context.contextCreationChance;
let jobsPerContext = process.argv[7] || config.context.jobsPerContext;


let requestingContextPool = [];
let activeContextPool = [];

let oldRequestingContextPoolLength = -1;
let oldActiveContextPoolLength = -1;

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
        console.log("Active Context Pool:", activeContextPool);
        return ctxId;
    }).catch( err => {
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
        console.log('remove ctx' + ctxId);
        removeContextIdFromPools();
        console.log("Active Context Pool:", activeContextPool);
    }).catch(err => {
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
    }).catch(err => {
        console.log(`Failed submit job for context ${ctxId} [tick: ${tickIndex}]`);
        if(err.response) console.log(err.response.body);
        else console.log(err);
    }).finally(() => {
        console.timeEnd(targetTime);
    });
}



function queueJobs(ctxId, num) {
    // var p = bb.resolve(null);
    // _.each(_.range(0, num), (index) => {
    //     p = sequential(p, () =>{
    //         return requestJob(ctxId, index);
    //     }).delay(10);
    // });

    var p = bb.all(_.map(_.range(0, num), index => {
        return requestJob(ctxId, index);
    }));


    return p.then(result => {
            console.log(`queue all jobs for context ${ctxId}`);
        })
        .delay(config.context.timeoutToKillContext)
        .then(() => {
            // remove context here
            return ops.deleteContextById(ctxId).then(dResult => {
                console.log(`removed context ${ctxId}: ${dResult}`);
                removeContextIdFromPools(ctxId);
            })
        })
        .catch(err => {
            console.log(err);
            removeContextIdFromPools(ctxId);
        });
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
            setTimeout(()=> {
                queueJobs(createdCtxId, jobsPerContext);
            }, 200);
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




