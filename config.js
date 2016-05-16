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
    timeoutToKillContext: process.env.SJMTEST_TIMEOUT_TO_KILL_CONTEXT || 10000
  },
  job: {
    host: host,
    interval: process.env.SJMTEST_JOB_INTERVAL || 1000,
    // jobClasses: ["sjm.jobs.SumJob"],
    jobClasses: ["sjm.jobs.SqlJob"],
    sumJob: {
      sleep: process.env.SJMTEST_JOB_SLEEP || 100000
    }
  }
};
