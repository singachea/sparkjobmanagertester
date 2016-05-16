'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');



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
    return rp({
        uri: `${config.job.host}/jobs`,
        method: 'POST',
        qs: {
            'context': ctxName,
            'job': _.sample(config.job.jobClasses)
        },
        body: {
            // sql: '',
            // x: 10000,
            // sleep: config.job.sumJob.sleep,
            // ex: false,
            sql : "select * from anno_clinvar.cpra_2016_02_0de5ec5_0",
            take: 5
        },
        timeout: 600000,
        headers: {},
        json: true
    })
}

function submitJobById(ctxId) {
    return submitJobByName(`ctx${ctxId}`);
}


module.exports = {
    getContextNames: getContextNames,
    deleteContextByName: deleteContextByName,
    deleteContextById: deleteContextById,
    createContextByName: createContextByName,
    createContextById: createContextById,
    submitJobByName: submitJobByName,
    submitJobById: submitJobById
};