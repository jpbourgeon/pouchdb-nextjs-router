#!/bin/sh

## SYSTEM DEPS
cd /home/node
apt-get update
apt-get install git bash curl python make g++

## HYPERFINE v1.2.0
wget https://github.com/sharkdp/hyperfine/releases/download/v1.2.0/hyperfine_1.2.0_amd64.deb
dpkg -i hyperfine_1.2.0_amd64.deb

## LAZYGIT v0.27.4
wget https://github.com/jesseduffield/lazygit/releases/download/v0.27.4/lazygit_0.27.4_Linux_x86_64.tar.gz
tar -xf lazygit_0.27.4_Linux_x86_64.tar.gz --directory /usr/bin

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