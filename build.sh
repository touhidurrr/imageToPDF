#!/bin/bash

npm install
npx browserify -s PDFDocument -i crypto -i iconv-lite node_modules/pdfkit/js/pdfkit.js | npx uglifyjs -cm > lib/pdfkit.js
npx browserify -s blobStream -p tinyify node_modules/blob-stream/index.js -o lib/blob-stream.js
rm -rf node_modules
rm -f LICENSE README.md build.sh package.json
