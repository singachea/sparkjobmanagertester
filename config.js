let _ = require('lodash');
let host = process.env.SJMTEST_HOST || 'http://localhost:8090'

module.exports = {
  statsd: {
    host: process.env.STATSD_HOST || '192.168.99.100',
    port: process.env.STATSD_PORT || 8125
  },
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
      cohortJob: {
        className: "sjm.jobs.SqlJob",
        body: () => {
          return {
            sql : "SELECT DISTINCT p.chrom, p.pos, p.ref, p.alt, p.highest_clinical_significance, p.variant_disease_name, p.rs_id, p.hli_allele_frequency, p.sample_count, p.gene_name, p.annotation, p.hgvs_c, p.hgvs_p, p.feature_type, p.feature_id, p.cadd_score, p.high_conf_region, CASE WHEN length(p.ref) = 1 and length(p.alt) = 1 THEN 'SNV' WHEN length(p.ref) > 1 and length(p.alt) = 1 THEN 'DEL' WHEN length(p.ref) = 1 and length(p.alt) > 1 THEN 'INS' ELSE 'COMPLEX' END AS variant_type FROM app_qs.annotation_kb_prejoint AS p WHERE (p.rs_id = \"rs1799759\") OR (p.chrom = \"chrX\" AND p.pos = \"74529484\" AND p.ref = \"T\" AND p.alt = \"G\") OR (p.gene_name = \"FAAH2\" AND p.hgvs_c = \"c.1404T>C\") OR (p.gene_name = \"RPGR\" AND p.hgvs_p = \"p.Ala388Ala\") ",
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
