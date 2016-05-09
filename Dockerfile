FROM node:6.1.0

RUN useradd -ms /bin/bash ream
USER ream

ADD package.json /tmp/package.json

RUN cd /tmp && npm install
RUN mkdir -p /home/ream/app && cp -a /tmp/node_modules /home/ream/app

WORKDIR /home/ream/app
ADD . /home/ream/app

