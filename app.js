'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');

// 0: node bin
// 1: file name

let contextSize = process.argv[2] || config.contextSize;
let tick = process.argv[3] || config.defaultTick;
let creatingChance = process.argv[4] || config.contextCreationChance;
let requestInterval = process.argv[5] || config.interval;
let removeExistingContextFlag = (process.argv[6] == "true");
let contextPool = [];
let createdPool = [];

console.log("contextSize", contextSize);
console.log("tick", tick);
console.log("removeExistingContextFlag", removeExistingContextFlag);
console.log("creatingChance", creatingChance);
console.log("-----------------------------------------------");


let options = (name) => {
  return {
    uri: `${config.host}/contexts/ctx${name}`,
    method: 'POST',
    qs: {
      'spark.driver.allowMultipleContexts': true,
      'context-factory': 'spark.jobserver.context.HiveContextFactory',
      'spark.mesos.coarse': true,
      'spark.cores.max': config.core,
      'spark.executor.memory': `${config.memory}g`
    },
    timeout: 60000,
    headers: {},
    json: true
  };
};

let optionsDelete = (name) => {
  return {
    uri: `${config.host}/contexts/ctx${name}`,
    method: 'DELETE',
    timeout: 60000,
    json: true
  };
};

let optionsDeleteWithPrefix = (name) => {
  return {
    uri: `${config.host}/contexts/${name}`,
    method: 'DELETE',
    timeout: 60000,
    json: true
  };
};

let optionsContext = () => {
  return {
    uri: `${config.host}/contexts`,
    method: 'GET',
    timeout: 60000,
    json: true
  };
};


let createContext = function (ctxid) {
  console.log('contextPool', contextPool.length);
  console.log('createdPool', createdPool.length);
  console.time('Time' + ctxid);
  contextPool.push(ctxid);

  rp(options(ctxid)).then( result => {
    console.log(result);
    createdPool.push(ctxid);
  }).catch( err => {
    console.log(`=========== ERROR for ${ctxid} =============`);
    console.log(err.response.body);
    console.log(`============================================`);
    _.remove(contextPool, e => e == ctxid)

  }).finally( () => {
    console.timeEnd('Time' + ctxid);
  });
};

let deleteContext = function () {
  if(createdPool.length <= 0) return;
  let ctxid = _.head(createdPool);

  let targetTime = `DeleteTime[${_.random(0, 1000)}]${ctxid}`;

  console.time(targetTime);
  rp(optionsDelete(ctxid)).then(result => {
    console.log('remove ctx' + ctxid);
    _.remove(contextPool, e => e == ctxid);
    _.remove(createdPool, e => e == ctxid);
  }).catch(err => {
    console.log('--------> cannot delete ' + ctxid, createdPool);
    // console.log(err.response.body);
    console.log(err);
  }).finally(() => {

    console.timeEnd(targetTime);
  })
};

let run = function () {
  tick++;

  if(Math.random() < creatingChance) {
    if(contextPool.length >= contextSize) return; // max out
    createContext(tick);
  }
  else {
    deleteContext()
  }
};


if(removeExistingContextFlag) {
  rp(optionsContext()).then(contexts => {
    contexts.forEach(ctx => {
      rp(optionsDeleteWithPrefix(ctx)).then(r => {
        console.log('removing ' + ctx);
      }).catch(err => {
        console.log(err);
      })
    })
  }).then( () => {
    setInterval(run, requestInterval);
  })
}
else {
  setInterval(run, requestInterval);
}
