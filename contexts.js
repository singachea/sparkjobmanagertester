'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');
let ops = require('./ops');


ops.getContextNames().then(ctxNames => {
    console.log(ctxNames);
});