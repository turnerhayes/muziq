#!/usr/bin/env nodejs

const fs = require("fs");
const path = require("path");
const DOMParser = require("xmldom").DOMParser;
const XMLSerializer = require("xmlserializer");
const nwmatcher = require("nwmatcher");

const parser = new DOMParser();

const xmlPath = path.resolve(__dirname, "musicxml", "Tim Minchin - Not Perfect.musicxml");

new Promise(
  (resolve, reject) => {
    fs.readFile(
      xmlPath,
      {
        encoding: "utf8",
      },
      (err, xml) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(xml);
      }
    );
  }
).then(
  (xml) => {
    const xmldoc = parser.parseFromString(xml);

    const matcher = nwmatcher({
      ...global,
      document: xmldoc,
    });

    const measures = matcher.select("measure");

    console.log(
      {
        // measure0: measures[0],
        // measure: XMLSerializer.serializeToString(measures[0]),
        notes: matcher.select("note pitch", measures[0]).map(
          (note) => XMLSerializer.serializeToString(note)
        ).join("\n\n"),
      }
    );
  }
).catch(
  (err) => console.error(err)
);


