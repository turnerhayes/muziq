const path = require("path");
const fs = require("fs");
const { xsltProcess, xmlParse } = require("xslt-processor");

const xsltPath = path.resolve(__dirname, "..", "app", "parttime.xsl");

const xslt = xmlParse(fs.readFileSync(xsltPath, { encoding: "utf8"}));

const xmlPath = path.resolve(__dirname, "..", "app", "musicxml", "Tim Minchin - Rock N Roll Nerd.musicxml");

const xml = xmlParse(fs.readFileSync(xmlPath, { encoding: "utf8" }));

const processed = xsltProcess(xslt, xml);

console.log(processed);

