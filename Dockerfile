# INSTALL SYSTEM PACKAGES ON TOP OF THE CURRENT NODE:ALPINE IMAGE
FROM node:lts-alpine
RUN apk update && apk add git bash curl python make g++ 
RUN apk add hyperfine --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# INSTALL AND BUILD POUCHDB
WORKDIR /usr/src
RUN git clone --depth 1 https://github.com/pouchdb/pouchdb.git
WORKDIR /usr/src/pouchdb
RUN npm install
RUN npm run build-node

# INSTALL THE ROUTER DEPENDENCIES
WORKDIR /usr/src/pouchdb-nextjs-router
COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci

# COPY AND BUILD THE ROUTER
COPY . .
RUN npm run build

# COPY OUR OWN TEST RUNNERS 
COPY ./bin/run-test.sh ../pouchdb/bin/run-test.sh


# RUN THE TESTS BY DEFAULT
CMD ["npm", "test"]