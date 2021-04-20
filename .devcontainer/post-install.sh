#!/bin/sh

cd /home/node

## SYSTEM DEPS
apt-get update
apt-get install git bash curl python make g++

## HYPERFINE v1.11.0
wget -nc https://github.com/sharkdp/hyperfine/releases/download/v1.11.0/hyperfine_1.11.0_amd64.deb
dpkg -i hyperfine_1.11.0_amd64.deb

## GH CLI v1.9.1
wget -nc https://github.com/cli/cli/releases/download/v1.9.1/gh_1.9.1_linux_amd64.deb
dpkg -i gh_1.9.1_linux_amd64.deb

## NPM
npm install --global npm@latest npm-check

# INSTALL AND BUILD POUCHDB FROM SOURCE
cd /workspaces
git clone --depth 1 https://github.com/pouchdb/pouchdb.git
cd /workspaces/pouchdb
sudo npm ci
sudo npm run build-node


# INSTALL THE AND BUILD THE ROUTER
cd /workspaces/pouchdb-nextjs-router
git fetch --all --prune
sudo npm ci
sudo npm run build