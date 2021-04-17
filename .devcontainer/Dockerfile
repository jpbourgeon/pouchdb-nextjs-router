# INSTALL SYSTEM PACKAGES ON TOP OF THE CURRENT NODE:ALPINE IMAGE
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node
RUN apt-get update
RUN apt-get install git bash curl python make g++
RUN wget https://github.com/sharkdp/hyperfine/releases/download/v1.2.0/hyperfine_1.2.0_amd64.deb
RUN dpkg -i hyperfine_1.2.0_amd64.deb
RUN npm install -g npm
