#!/bin/bash

npm install
npx browserify -p tinyify -s PDFDocument node_modules/pdfkit/js/pdfkit.js -o lib/pdfkit.js
npx browserify -p tinyify -s blobStream node_modules/blob-stream/index.js -o lib/blob-stream.js
rm -rf node_modules
rm build.sh
