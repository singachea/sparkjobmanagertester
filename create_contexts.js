'strict';
let rp = require('request-promise');
let config = require('./config');
let ops = require('./ops');
let _ = require('lodash');
let bb = require('bluebird');

let winston = require('winston');
winston.add(winston.transports.File, { filename: 'logs/creating_context.log' });

let logger = winston;

let autoDeleteContext = process.argv[7] == "true"; 
let contextSize = process.argv[3] || config.context.contextSize;
let tick = process.argv[4] || config.context.defaultTick;
let requestInterval = process.argv[5] || config.context.interval;
let creatingChance = process.argv[6] || config.context.contextCreationChance;
let jobsPerContext = process.argv[7] || config.context.jobsPerContext;


let contextPool = [];
let createdPool = [];

let oldContextPoolLength = -1;
let oldCreatedPoolLength = -1;

console.log("contextSize", contextSize);
console.log("starting tick", tick);
console.log("creatingChance", creatingChance);
console.log("requestInterval", requestInterval);
console.log("-----------------------------------------------");



let createContext = function (ctxId) {

    var measuredCreationTime = `Context Creation ${ctxId}`;
    console.time(measuredCreationTime);
    console.log(`Initiate context creation for ${ctxId}`);

    return ops.createContextById(ctxId).then(result => {
        createdPool.push(ctxId);
        console.log("Active Context Pool:", createdPool);
    }).catch( err => {
        logger.error(err);
        console.log(`=========== ERROR for ${ctxId} =============`);
        if(err.response) console.log(err.response.body);
        else console.log(err);
        console.log(`============================================`);
        _.remove(contextPool, e => e == ctxId)

    }).finally( () => {
        console.timeEnd(measuredCreationTime);
    });
};


let deleteContext = function () {
    if(createdPool.length <= 0) return;
    let ctxId = _.sample(createdPool);

    let measuredDeletionTime = `Context Deletion [${_.random(0, 1000)}] ${ctxId}`;
    console.time(measuredDeletionTime);


    return ops.deleteContextById(ctxId).then(result => {
        console.log('remove ctx' + ctxId);
        _.remove(contextPool, e => e == ctxId);
        _.remove(createdPool, e => e == ctxId);
        console.log("Active Context Pool:", createdPool);
    }).catch(err => {
        logger.error(err);
        console.log("Can't remove context", ctxId);
        if(err.response) console.log(err.response.body);
        else console.log(err);
    }).finally(() => {
        console.timeEnd(measuredDeletionTime);
    })
};


let queueJobs = function (ctxId, num) {
    let qJobs = _.map(_.range(0, num), index => {
        return ops.submitJobById(ctxId);
    });
    
    return bb.all(qJobs).then(result => {
            console.log(`queue all jobs for context ${ctxId}`);
        })
        .delay(10000)
        .then(() => {
            // remove context here
            return ops.deleteContextById(ctxId).then(dResult => {
                console.log(`removed context ${dResult}`);
                _.remove(contextPool, e => e == ctxId);
                _.remove(createdPool, e => e == ctxId);
            })
        })
        .catch(err => {
            console.log(err)
        });
};


let run = function () {
    tick++;

    if(oldContextPoolLength != contextPool.length || oldCreatedPoolLength != createdPool.length) {
        console.log('created/creating pool', `${createdPool.length}/${contextPool.length}`);
        oldContextPoolLength = contextPool.length;
        oldCreatedPoolLength = createdPool.length;
    }

    if(!autoDeleteContext) {
        if(contextPool.length >= contextSize) return; // max out
        createContext(tick);
        queueJobs(tick, jobsPerContext);
    }
    else {
        if(Math.random() < creatingChance) {
            if(contextPool.length >= contextSize) return; // max out
            createContext(tick);
        }
        else {
            deleteContext();
        }
    }
};


setInterval(run, requestInterval);




