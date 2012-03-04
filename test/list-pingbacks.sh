#!/bin/sh

mongo localhost:27017/source --quiet list-pingbacks.js
echo ""
mongo localhost:27017/target --quiet list-pingbacks.js
