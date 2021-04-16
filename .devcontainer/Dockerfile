# INSTALL SYSTEM PACKAGES ON TOP OF THE CURRENT NODE:ALPINE IMAGE
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node
RUN apt-get update
RUN apt-get install git bash curl python make g++
RUN wget https://github.com/sharkdp/hyperfine/releases/download/v1.2.0/hyperfine_1.2.0_amd64.deb
RUN dpkg -i hyperfine_1.2.0_amd64.deb
RUN npm install -g npm

# INSTALL AND BUILD POUCHDB FROM SOURCE
WORKDIR /workspaces
RUN git clone --depth 1 https://github.com/pouchdb/pouchdb.git
WORKDIR /workspaces/pouchdb
RUN sudo npm install
RUN npm run build-node

# INSTALL THE DEPENDENCIES AND BUILD THE ROUTER
WORKDIR /workspaces/pouchdb-nextjs-router
RUN npm install
RUN npm run build
