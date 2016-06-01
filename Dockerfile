FROM node:6.1.0

RUN apt-get update
RUN apt-get install -y vim

ADD package.json /tmp/package.json

RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app

WORKDIR /app
ADD . /app

