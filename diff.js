/**
 * Created by singachea on 5/10/16.
 */
'strict';
let rp = require('request-promise');
let config = require('./config');
let _ = require('lodash');
let bb = require('bluebird');


let optionsContext = () => {
    return {
        uri: `${config.context.host}/status/metrics`,
        method: 'GET',
        timeout: 600000,
        json: true
    };
};



function mergeObjectKeyValue(x) {
    return _.transform(x, function(r,v, k){ r.push(k + "::" + v )}, [])[0];
}


function diff(array, name, attr) {
    var target = _.find(array, {name: name});
    var rest = _.filter(array, el => el.name != name);

    var attrs = _.reduce(rest, (acc, el) => { return _.union(acc, el[attr]) }, []);

    return _.difference(target[attr], attrs);
}


rp(optionsContext()).then(rows => {
    var sups = _.map(rows, r => {
        return {
            name: r.supervisorAddress,
            creating: _.map(r.createContextRequests, mergeObjectKeyValue),
            deleting: _.map(r.deleteContextRequests, mergeObjectKeyValue),
            activeContexts: _.map(r.activeContexts, mergeObjectKeyValue)
        };
    });


    _.forEach(sups, el => {
        console.log(el.name);

        console.log("creating\n", diff(sups, el.name, "creating"));

        console.log("deleting\n", diff(sups, el.name, "deleting"));
        console.log("active\n", diff(sups, el.name, "activeContexts"));
        console.log("------------------------------------------");
    });

    // console.log(sups);
    // console.log(sups[0]['akka.tcp://ClusterSystem@10.2.67.236:33077'].creating);
});
