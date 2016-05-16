'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');
let ops = require('./ops');

let requestInterval = process.argv[2] || config.job.interval;


function sequential(p, f) {
    return p.then(() => {
        return f()
    });
}

let run = (tick) => {

    ops.getContextNames().then(contexts => {
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


                return ops.submitJobByName(cName).then(result => {
                    console.log(`Successful Submit job for context ${cName} [tick: ${tickIndex}]`);
                    console.log(result);
                }).catch(err => {
                    console.log(`Failed submit job for context ${cName} [tick: ${tickIndex}]`);
                    if(err.response) console.log(err.response.body);
                    else console.log(err);
                }).finally(() => {
                    console.timeEnd(targetTime);
                })
            }).delay(_.random(1, requestInterval));
        });

        p.then(() => {
            run(tick + contexts.length);
        });
    });
};


run(0);





