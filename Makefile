REPO=docker-dev.hli.io/ccm/sjmtester
TAG=0.0.1
CONTAINER=sjmtester

default:
		docker build -t $(CONTAINER) .

tag:
		docker tag $(CONTAINER) $(REPO):$(TAG)

push:
		docker push $(REPO):$(TAG)

run-container:
		docker run -dit $(CONTAINER) bash

run-context:
		npm start

run-job:
		npm run job
