#!/bin/bash

npm install
npx browserify -p tinyify src/main.js > bundle.js
rm -rf src node_modules
rm build.sh
