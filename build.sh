#!/bin/bash

bun install

mkdir public/lib
bunx --bun browserify -s blobStream node_modules/blob-stream/index.js -o public/lib/blob-stream.js
bunx --bun browserify -s PDFDocument -i crypto -i iconv-lite node_modules/pdfkit/js/pdfkit.js | bunx --bun uglifyjs -cm > public/lib/pdfkit.js

bun build src/main.ts --outdir public --external pdfkit --external blob-stream
