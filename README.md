# Installation (require node 6) 

```bash
$> npm install
```

# Run


## Clean Contexts
```bash
$> node clean_contexts                          # clean all context
$> node clean_contexts false ctx1 ctx2 ctx3     # clean all ctx1 ctx2 ctx3
$> node clean_contexts true 1 2 3               # clean all ctx1 ctx2 ctx3
```

## Create Contexts
```bash
$> node create_contexts <autoDeleteContext: true | false> <contextSize:5> <startingCounter:100> <requestInterval:1000> <contextCreationChance:0.7> <jobsPerContext: 8> <createSubcohortJob> <number_of_subcohort: 5> <subcohort_loop:300>_
$> node create_contexts true 5 10000 1000 0.9 7            # 7 jobs per context and context will be removed after all jobs are done
$> node create_contexts false 5 10000 1000 0.9 7           # no jobs submitted, and context is created and delete randomly with probability of 0.9
$> node create_contexts true 5 10000 1000 0.9 7 true 5     # 7 jobs per context and context will be removed when all subcohort jobs are done
```



(obsolete)
```bash
$> node app.js <contextSize:5> <startingCounter:100> <contextCreationChance:0.7> <requestInterval:1000> <clearExistingContext:false>
$> node app.js 5 100 0.7 100 true



$> node job.js <requestInterval:3000>
```


sudo docker run -dit --name sjmtester -e "SJMTEST_HOST=http://10.2.76.83:31500" -e "STATSD_HOST=10.2.93.107" docker-dev.hli.io/ccm/sjmtester:0.0.2 bash
sudo docker exec -it sjmtester bash
