'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');

let requestInterval = process.argv[2] || config.job.interval;

let options = (name) => {
    return {
        uri: `${config.job.host}/jobs`,
        method: 'POST',
        qs: {
            'context': name,
            'job': _.sample(config.job.jobClasses)
        },
        body: {
            x: 10000,
            sleep: config.job.sumJob.sleep,
            ex: false
        },
        timeout: 600000,
        headers: {},
        json: true
    };
};


let optionsContext = () => {
    return {
        uri: `${config.job.host}/contexts`,
        method: 'GET',
        timeout: 600000,
        json: true
    };
};

function sequential(p, f) {
    return p.then(() => {
        return f()
    });
}

let run = (tick) => {

    rp(optionsContext()).then(contexts => {
        console.log("Available contexts:");
        console.log(contexts);
        console.log("====================");

        var p = bb.resolve(null);

        _.each(contexts, (cName, index) => {
            p = sequential(p, () =>{
                let tickIndex = tick + index;
                let targetTime = `JobTick${tickIndex}`;

                console.time(targetTime);
                console.log(`Submit job for context ${cName} [tick: ${tickIndex}]`);

                return rp(options(cName)).then(result => {
                    console.log(`Successful Submit job for context ${cName} [tick: ${tickIndex}]`);
                    console.log(result);
                }).catch(err => {
                    console.log(`Failed submit job for context ${cName} [tick: ${tickIndex}]`);
                    if(err.response) console.log(err.response.body);
                    else console.log(err);
                }).finally(() => {
                    console.timeEnd(targetTime);
                })
            }).delay(requestInterval);
        });

        p.then(() => {
            run(tick + contexts.length);
        });
    });
};


run(0);




