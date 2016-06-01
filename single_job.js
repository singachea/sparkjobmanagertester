'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');
let ops = require('./ops');


let cName = process.argv[2];
let jobType = process.argv[3] || 'cohortJob';
let alsoRunSubCohort = process.argv[4] || false;
let numberOfSubCohorts = 4;
let runningLoops = 3;

if(!cName) throw new Error("Enter your context name!");


console.time("Submission Time");

ops.submitSingleJob(cName, jobType).then(result => {
    console.log(`Successful Submit job for context ${cName} [${jobType}]`);
    console.log(result);

    if(alsoRunSubCohort) {
        return ops.isJobSuccess(result.jobId).then(r => {
            if (r.success) {
                return ops.runSubCohortJobs(numberOfSubCohorts, cName, result.result_location, runningLoops);
            }
            else {
                console.log(r.result)
            }
        })
    }
}).catch(err => {
    console.log(`Failed submit job for context ${cName} [${jobType}]`);
    if(err.response) console.log(err.response.body);
    else console.log(err);
}).finally(() => {
    console.timeEnd("Submission Time");
});


// return ops.runSubCohortJobs(numberOfSubCohorts, 'ctx2', 'hdfs://10.2.33.211:50030/test/data-ungoverned/query-service-test/cq03935e80b0-27a5-11e6-adcb-11fc8d353a75.parquet', runningLoops);