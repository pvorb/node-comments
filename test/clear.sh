#!/bin/sh

mongo localhost:27017/source --quiet --eval "printjson(db.dropDatabase())"
mongo localhost:27017/target --quiet --eval "printjson(db.dropDatabase())"
