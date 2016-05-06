'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');

let requestInterval = process.argv[2] || config.job.interval;

let options = (name) => {
    return {
        uri: `${config.job.host}/contexts/jobs`,
        method: 'POST',
        qs: {
            'context': name,
            'job': _.sample(config.job.jobClasses)
        },
        body: {
            x: 10000,
            sleep: 5000,
            ex: false
        },
        timeout: 60000,
        headers: {},
        json: true
    };
};


let optionsContext = () => {
    return {
        uri: `${config.job.host}/contexts`,
        method: 'GET',
        timeout: 60000,
        json: true
    };
};


let run = () => {
    let tick = 0;
    rp(optionsContext()).then(contexts => {
        console.log("Available contexts:");
        console.log(contexts);
        console.log("====================");

        setInterval(() => {
            _.forEach(contexts, cName => {
                tick++;
                let targetTime = `JobTick${tick}`;

                console.time(targetTime);
                console.log(`Submit job for context ${cName} [tick: ${tick}]`);
                rp(options(cName)).then(result => {
                    console.log(`Successful Submit job for context ${cName} [tick: ${tick}]`);
                    console.log(result);
                }).catch(err => {
                    console.log(`Failed submit job for context ${cName} [tick: ${tick}]`);
                    if(err.response) console.log(err.response.body);
                    else console.log(err);
                }).finally(() => {
                    console.timeEnd(targetTime);
                })
            })
        }, requestInterval);
    });
};


run();


