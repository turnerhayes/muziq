"use strict";

const mongoose = require("mongoose");
const debug    = require("debug")("muziq:db");
const Config   = require("../lib/config");

mongoose.Promise = Promise;

mongoose.set("debug", debug.enabled);

exports = module.exports = mongoose.connect(Config.storage.db.url);
