"use strict";

const express = require("express");

const router = express.Router();

router.use("/users", require("./users"));

exports = module.exports = router;
