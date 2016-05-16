'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');
let ops = require('./ops');


var prefix = process.argv[2] == "true";
var cliContexts = _.slice(process.argv, 3, process.argv.length);

if(prefix) {
    cliContexts = _.map(cliContexts, e => "ctx" + e);
}

var contextNames = cliContexts.length > 0 ? bb.resolve(cliContexts) : ops.getContextNames();


console.log("=========== CLEANING CONTEXTS ============= ");
contextNames.then(ctxNames => {
    console.log(`Contexts to be removed (${ctxNames.length}):`);
    console.log(ctxNames);
    console.log("-----------------");

    var removedContexts = _.map(ctxNames, ctxName => {
        return ops.deleteContextByName(ctxName).then(ctx => {
            console.log(`Removed ${ctxName}: ${ctx}`);
        }).catch(err => {
           console.error(`Crap! something wrong with context deletion of "${ctx}"`)
        });
    });

    return bb.all(removedContexts).then(ctxs  => {
        console.log("All context deletions has been perform!");
    })

}).catch(err => {
    console.error("Oop! can't pull context list from server!");
    console.error(err);
}).finally(() => {
    console.log("========== END CLEANING CONTEXTS =========== ");
});




