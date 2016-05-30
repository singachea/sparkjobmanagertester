'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');
let ops = require('./ops');


let cName = process.argv[2];
let jobType = process.argv[3] || 'cohortJob';

if(!cName) throw new Error("Enter your context name!");

console.time("Submission Time");

ops.submitSingleJob(cName, jobType).then(result => {
    console.log(`Successful Submit job for context ${cName} [${jobType}]`);
    console.log(result);
}).catch(err => {
    console.log(`Failed submit job for context ${cName} [${jobType}]`);
    if(err.response) console.log(err.response.body);
    else console.log(err);
}).finally(() => {
    console.timeEnd("Submission Time");
});