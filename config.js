let _ = require('lodash');
let host = process.env.SJMTEST_HOST || 'http://localhost:8090'

module.exports = {
  context: {
    host: host,
    core: process.env.SJMTEST_CORE || 4,
    memory: process.env.SJMTEST_MEMORY || 10,
    interval: process.env.SJMTEST_CONTEXT_INTERVAL || 1000,
    contextSize: process.env.SJMTEST_CONTEXT_SIZE || 5,
    defaultTick: process.env.SJMTEST_CONTEXT_TICK || 100,
    contextCreationChance: process.env.SJMTEST_CREATING_CHANCE || 0.90,
    jobsPerContext: process.env.SJMTEST_JOBS_PER_CONTEXT || 8,
    timeoutToKillContext: process.env.SJMTEST_TIMEOUT_TO_KILL_CONTEXT || 20000
  },
  job: {
    host: host,
    interval: process.env.SJMTEST_JOB_INTERVAL || 1000,
    // jobTypes: ["sumJob"],
    jobTypes: ["sqlJob"],
    runInParallel: true,
    params: {
      sqlJob: {
        className: "sjm.jobs.SqlJob",
        body: () => {
          return {
            sql : `select * from anno_clinvar.cpra_2016_02_0de5ec5_0 limit ${_.random(1, 100000)}`,
            cacheDf: false
          }  
        }
      },
      sumJob: {
        className: "sjm.jobs.SumJob",
        body: () => {
          return {
            x: 10000,
            sleep: 10000,
            ex: false
          }  
        }
      }
    }
  }
};
