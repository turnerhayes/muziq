#!/usr/bin/env nodejs

/* eslint-disable */

// const MIDI = require("midi");
const fs = require("fs");

const MIDINoteConverter = require("./midi-note-converter");

const sampleMidi = require("../app/components/MIDIRecorder/sample-messages.json");

const MESSAGE_TYPES = {
    NOTE_ON: "NOTE_ON",
    NOTE_OFF: "NOTE_OFF",
};

const MESSAGE_TYPES_BY_CODE = {
    [0b1000]: MESSAGE_TYPES.NOTE_OFF,
    [0b1001]: MESSAGE_TYPES.NOTE_ON,
};

function toMusicXML(midi) {
    const notes = [];

    let currentNote;

    midi.forEach(
        (message) => {
            const type = MESSAGE_TYPES_BY_CODE[message.data[0] >> 4];
            
            const channel = message.data[0] & 0b00001111;
            
            if (type === MESSAGE_TYPES.NOTE_ON || type === MESSAGE_TYPES.NOTE_OFF) {
                const key = message.data[1] & 0b0111111;
                
                if (type === MESSAGE_TYPES.NOTE_ON) {
                    if (currentNote === undefined) {
                      currentNote = key;  
                    }

                    if (currentNote !== key) {
                        notes.push(currentNote);
                        currentNote = key;
                    }
                }
                else {
                    if (currentNote !== undefined) {
                        notes.push(currentNote);
                        currentNote = undefined;
                    }
                }
            }
        }
    );

    if (currentNote !== undefined) {
        notes.push(currentNote);
    }

    let measureNumber = 0;

    const measures = notes.map(
        (note) => {
            measureNumber += 1;
            const noteDescription = MIDINoteConverter(note);

            const alter = noteDescription.alter ?
                `<alter>${noteDescription.alter}</alter>` :
                "";

            let pitch = `<pitch>
    <step>${noteDescription.step}</step>
    <octave>${noteDescription.octave}</octave>
    ${alter}
</pitch>`

            return `<measure number="${measureNumber}">
    <attributes>
      <divisions>2</divisions>
    </attributes>
    <note>
        ${pitch}
        <duration>8</duration>
        <type>whole</duration>
    </note>
</measure>`
        }
    ).join("\n");

    const now = new Date();
    
    const year = now.getFullYear();

    let month = now.getMonth() + 1;
    if (month < 10) {
      month = "0" + month;
    }

    let date = now.getDate();
    if (date < 10) {
      date = "0" + date;
    }
        
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <!DOCTYPE score-partwise PUBLIC
        "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
        "http://www.musicxml.org/dtds/partwise.dtd">
    <score-partwise version="3.1">
        <work>
          <work-title>Generated Score</work-title>
        </work>
        <identification>
          <encoding>
            <encoding-date>${year}-${month}-${date}</encoding-date>
            <software>Muziq Web</software>
          </encoding>
        </identification>
        <part-list>
          <score-part id="P1">
            <part-name>Piano</part-name>
          </score-part>
          ${measures.split("\n").map((line) => "  " + line).join("\n")}
        </part-list>
    </score-partwise>`;
    // <part>
    //   ${noteXML}
    // </part>
}

function writeMainJS(xml) {
    fs.writeFileSync(
        "./main.js",
        `
var xml = ${JSON.stringify(xml)};

var codeDisplay = document.getElementById("xml-display");
codeDisplay.innerText = window.formatXML(xml);

hljs.highlightBlock(codeDisplay);

var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("container");

osmd.load(xml)
    .then(
        () => osmd.render()
    );
        `
    );
}

writeMainJS(toMusicXML(sampleMidi));






// <part-list>
//         <score-part id="P1">
//           <part-name>Music</part-name>
//         </score-part>
//       </part-list>
//       <part id="P1">
//         <measure number="1">
//           <attributes>
//             <divisions>1</divisions>
//             <key>
//               <fifths>0</fifths>
//             </key>
//             <time>
//               <beats>4</beats>
//               <beat-type>4</beat-type>
//             </time>
//             <staves>2</staves>
//             <clef number="1">
//               <sign>G</sign>
//               <line>2</line>
//             </clef>
//             <clef number="2">
//               <sign>F</sign>
//               <line>2</line>
//             </clef>
//           </attributes>
//           <note>
//             <pitch>
//               <step>C</step>
//               <octave>5</octave>
//             </pitch>
//             <duration>4</duration>
//             <type>whole</type>
//           </note>
//         </measure>
