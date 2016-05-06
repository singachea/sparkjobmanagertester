module.exports = {
  context: {
    host: 'http://localhost:8090',
    core: 4,
    memory: 10,
    interval: 1000,
    contextSize: 5,
    defaultTick: 100,
    contextCreationChance: 0.70
  },
  job: {
    host: 'http://localhost:8090',
    interval: 3000,
    jobClasses: ["sjm.jobs.SumJob"]
  }
};
