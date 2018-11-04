/* global require, Promise */

import React from "react";
import PropTypes from "prop-types";
import localForage from "localforage";
import { Set, Map, fromJS } from "immutable";
import { withStyles } from "@material-ui/core/styles";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import PlayIcon from "@material-ui/icons/PlayArrow";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import WebMIDI from "webmidi";
// import { xsltProcess } from "xslt-processor";

import Keyboard from "@app/components/Keyboard";
import partTimeXSLTString from "@app/parttime.xsl";
// import { NoteNameToNumber } from "../Keyboard/midi-note-converter";

const req = require.context("../../musicxml", true, /\.(\w*)xml$/);
const xmlFiles = req.keys().reduce(
  (files, fileName) => {
    files[fileName] = req(fileName);

    return files;
  },
  {}
);

let resolveMidiLoadPromise;

const midiLoadPromise = new Promise(
  (resolve, reject) => {
    let isResolved = false;

    resolveMidiLoadPromise = () => {
      if (!isResolved) {
        resolve();
      }
    };

    WebMIDI.enable((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();

      isResolved = true;
    });
  }
);

const parser = new DOMParser();

const partTimeXSLT = parser.parseFromString(partTimeXSLTString, "application/xml");

const STORAGE_KEY = "KeyboardTutorial_xmlFile";

const NOTE_XPATH = (staffNumber) => `note[staff/text() = "${staffNumber}"]`;

const styles = {
  keyboardContainer: {
    overflow: "auto",
  },
};

const noteNodeToName = (node) => {
  const step = node.querySelector("pitch step");
  const octave = node.querySelector("pitch octave");
  return `${step.textContent}${octave.textContent}`;
};

class KeyboardTutorial extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
  }

  state = {
    xmlFile: null,
    leftHandKeys: Set(),
    rightHandKeys: Set(),
    leftHandMeasureNumber: null,
    rightHandMeasureNumber: null,
    totalLeftHandDuration: 0,
    totalRightHandDuration: 0,
    xmlDocument: null,
    midiOutputID: null,
    midiOutputs: null,
    midiLoaded: false,
    lastNoteNode: null,
    lastLeftHandNoteNode: null,
    lastRightHandNoteNode: null,
    scoreMetadata: Map(),
    repeats: Set(),
    repeatCount: 0,
  }

  constructor(...args) {
    super(...args);

    localForage.getItem(STORAGE_KEY).then(
      (value) => {
        if (value) {
          this.setState({
            xmlFile: value,
          });
        }
      }
    );
  }

  componentDidMount() {
    midiLoadPromise.then(
      () => {
        WebMIDI.addListener("connected", this.handleDeviceConnected);
        WebMIDI.addListener("disconnected", this.handleDeviceDisconnected);
      }
    );

    this.setMIDILoaded();
    this.setDefaultMIDIOutput();
  }
  
  componentDidUpdate() {
    if (!this.state.midiLoaded) {
      this.setMIDILoaded();
    }

    this.setDefaultMIDIOutput();
  }
  
  componentWillUnmount() {
    WebMIDI.removeListener("connected", this.handleDeviceConnected);
    WebMIDI.removeListener("disconnected", this.handleDeviceDisconnected);
  }

  getNextNotes({
    lastNote = this.state.lastNoteNode,
    partID,
    staffNumber = 1,
  }) {
    if (!this.state.xmlDocument) {
      return null;
    }

    const startMeasureNumber = lastNote ?
      Number(lastNote.closest("measure").getAttribute("number")) :
      1;

    const note = this.state.xmlDocument.evaluate(
      lastNote ?
        `following-sibling::${NOTE_XPATH(staffNumber)}|ancestor::measure/following-sibling::measure/part[@id="${partID}"]/${NOTE_XPATH(staffNumber)}` :
        `//part[@id="${partID}"]/${NOTE_XPATH(staffNumber)}`,
      lastNote ?
        lastNote :
        this.state.xmlDocument,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;
        
    if (!note) {
      return null;
    }

    const duration = Number(note.querySelector("duration").textContent);

    const noteMeasure = Number(note.closest("measure").getAttribute("number"));

    if (note.querySelector("rest")) {
      return {
        rest: true,
        duration,
        lastNoteNode: note,
        measureNumber: noteMeasure,
      };
    }

    const chordNotes = this.getChordNoteNodes({ startNote: note });

    const notes = [
      noteNodeToName(note),
      ...chordNotes.map(noteNodeToName),
    ];


    let crossedRepeat = null;

    this.state.repeatRanges.forEach(
      (repeatInfo) => {
        if (
          repeatInfo.getIn([ "start", "measureNumber" ]) <= startMeasureNumber &&
          repeatInfo.getIn([ "end", "measureNumber" ]) < noteMeasure
        ) {
          crossedRepeat = repeatInfo;

          // terminate loop early
          return false;
        }
      }
    );

    return {
      notes,
      measureNumber: noteMeasure,
      duration,
      lastNoteNode: chordNotes.length > 0 ?
        chordNotes[chordNotes.length - 1] :
        note,
      crossedRepeat,
    };
  }

  getChordNoteNodes({ xmlDocument = this.state.xmlDocument, startNote }) {
    const staffNumber = Number(startNote.querySelector("staff").textContent);

    const siblingsIterator = xmlDocument.evaluate(
      `following-sibling::${NOTE_XPATH(staffNumber)}`,
      startNote,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE
    );

    const siblings = [];

    let nextNoteNode = siblingsIterator.iterateNext();
    while (nextNoteNode && nextNoteNode.querySelector("chord")) {
      siblings.push(nextNoteNode);
      
      nextNoteNode = siblingsIterator.iterateNext();
    }

    return siblings;
  }

  addRepeatStartFollowingNotes({ xmlDocument, start, partID }) {
    const nextRightHandNote = xmlDocument.evaluate(
      `ancestor::measure/part[@id="${partID}"]/${NOTE_XPATH(1)}`,
      start.node,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;

    const nextLeftHandNote = xmlDocument.evaluate(
      // eslint-disable-next-line no-magic-numbers
      `ancestor::measure/part[@id="${partID}"]/${NOTE_XPATH(2)}`,
      start.node,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;

    let rightNotes;

    if (nextRightHandNote) {
      const chordNotes = this.getChordNoteNodes({ xmlDocument, startNote: nextRightHandNote });

      rightNotes = [
        nextRightHandNote,
        ...chordNotes,
      ];
    }

    let leftNotes;

    if (nextLeftHandNote) {
      const chordNotes = this.getChordNoteNodes({ xmlDocument, startNote: nextLeftHandNote });

      leftNotes = [
        nextLeftHandNote,
        ...chordNotes,
      ];
    }

    start.followingNoteNodes = {
      leftHand: leftNotes,
      rightHand: rightNotes,
    };

    return start;
  }

  getRepeatRanges({ xmlDocument, partID }) {
    const repeatIterator = xmlDocument.evaluate(
      `//part[@id="${partID}"]/barline/repeat`,
      xmlDocument,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE
    );

    let repeatNode = repeatIterator.iterateNext();

    const repeatRanges = [];

    let repeatStart = null;

    while (repeatNode) {
      const measureNumber = Number(repeatNode.closest("measure").getAttribute("number"));
      const direction = repeatNode.getAttribute("direction");

      if (direction === "forward") {
        // @todo: Find out if there is a use case where multiple forward repeats can occur without backwards repeats
        repeatStart = {
          node: repeatNode,
          measureNumber,
        };

        this.addRepeatStartFollowingNotes({ xmlDocument, start: repeatStart, partID });
      }
      else if (direction === "backward") {
        let start = repeatStart;
        if (!start) {
          if (repeatRanges.length === 0) {
            // No start repeat, and no previous repeat end; go back to start
            start = {
              node: null,
              measureNumber,
            };
          }
          else {
            // there was a previous repeat end; start from there
            start = repeatRanges[repeatRanges.length - 1].end;
          }

          this.addRepeatStartFollowingNotes({ xmlDocument, start, partID });
        }

        repeatRanges.push({
          start,
          end: {
            measureNumber,
            node: repeatNode,
          },
        });
      }

      repeatNode = repeatIterator.iterateNext();
    }

    return fromJS(repeatRanges);
  }
  
  setMIDILoaded() {
    if (WebMIDI.enabled) {
      this.setState({
        midiLoaded: true,
        midiOutputs: WebMIDI.outputs,
      });

      resolveMidiLoadPromise();

      return;
    }

    midiLoadPromise.then(
      () => {
        this.setState({
          midiLoaded: true,
          midiOutputs: WebMIDI.outputs,
        });
      }
    );
  }

  setDefaultMIDIOutput() {
    this.setState((prevState) => {
      if (!prevState.midiOutputID || !WebMIDI.getOutputById(prevState.midiOutputID)) {
        return {
          midiOutputID: this.getDefaultMIDIOutput()
        };
      }

      return null;
    });
  }

  getDefaultMIDIOutput() {
    let outputID;
    for (let outputIndex = 0; outputIndex  < WebMIDI.outputs.length; outputIndex++) {
      const output = WebMIDI.outputs[outputIndex];
      outputID = output.id;

      if (output.name.toLowerCase().includes("synth")) {
        break;
      }
    }

    return outputID;
  }

  getScoreMetadata(doc) {
    const metadata = {};
  
    metadata.parts = {};

    Array.from(doc.querySelectorAll("part-list score-part")).forEach(
      (partNode) => {
        const part = {
          id: partNode.id,
  
          name: partNode.querySelector("part-name").textContent,
        };
  
        const midiInstrument = partNode.querySelector("midi-instrument");
  
        if (midiInstrument) {
          part.midi = {};
          
          const channel = midiInstrument.querySelector("midi-channel");
          
          if (channel) {
            part.midi.channel = Number(channel.textContent);
          }
  
          const program = midiInstrument.querySelector("midi-program");
  
          if (program) {
            part.midi.program = Number(program.textContent);
          }
  
          const volume = midiInstrument.querySelector("volume");
  
          if (volume) {
            part.midi.volume = Number(volume.textContent);
          }
        }
  
        metadata.parts[part.id] = part; 
      }
    );
    
    const attributesNode = doc.querySelector("measure attributes");    

    metadata.clefs = {};

    Array.from(attributesNode.querySelectorAll("clef")).forEach(
      (clefNode) => {
        const clef = {};

        const clefNumber = Number(clefNode.getAttribute("number"));

        clef.number = clefNumber;

        clef.sign = clefNode.querySelector("sign").textContent;

        clef.line = Number(clefNode.querySelector("line").textContent);

        metadata.clefs[clefNumber] = clef;
      }
    );

    return fromJS(metadata);
  }

  playNotes() {
    const part = this.state.scoreMetadata.get("parts").first();

    const DEFAULT_CHANNEL = 1;

    if (!this.state.leftHandKeys.isEmpty()) {
      this.output().playNote(
        this.state.leftHandKeys.toArray(),
        part.getIn(
          [ "midi", "channel" ],
          DEFAULT_CHANNEL
        )
      ).stopNote(
        this.state.leftHandKeys.toArray(),
        part.getIn(
          [ "midi", "channel" ],
          DEFAULT_CHANNEL
        ),
        {
          time: "+6000",
        }
      );
    }

    if (!this.state.rightHandKeys.isEmpty()) {
      this.output().playNote(
        this.state.rightHandKeys.toArray(),
        part.getIn(
          [ "midi", "channel" ],
          DEFAULT_CHANNEL
        )
      ).stopNote(
        this.state.rightHandKeys.toArray(),
        part.getIn(
          [ "midi", "channel" ],
          DEFAULT_CHANNEL
        ),
        {
          time: "+6000",
        }
      );
    }
  }

  output() {
    if (!WebMIDI.enabled || !this.state.midiOutputID) {
      return null;
    }

    return WebMIDI.getOutputById(this.state.midiOutputID); 
  }

  handleXMLFileChange = (event) => {
    const xmlFile = event.target.value || null;

    this.setState({
      xmlFile,
    });

    if (xmlFile === null) {
      localForage.removeItem(STORAGE_KEY);
    }
    else {
      localForage.setItem(STORAGE_KEY, xmlFile);
    }
  }

  handleLoadXMLButtonClick = () => {
    let doc = parser.parseFromString(xmlFiles[this.state.xmlFile], "application/xml");

    if (doc.querySelector("score-partwise")) {
      const xsltProcessor = new XSLTProcessor();
      xsltProcessor.importStylesheet(partTimeXSLT);
      doc = xsltProcessor.transformToDocument(doc);
    }

    const scoreMetadata = this.getScoreMetadata(doc);
  
    const partID = scoreMetadata.get("parts").keySeq().first();
    
    const programNumber = scoreMetadata.getIn([ "parts", partID, "midi", "program" ]);
    
    if (programNumber) {
      const channel = scoreMetadata.getIn([ "parts", partID, "midi", "channel" ]);

      midiLoadPromise.then(
        () => {
          this.output().sendProgramChange(programNumber, channel);
        }
      );
    }
    
    const repeatRanges = this.getRepeatRanges({
      xmlDocument: doc,
      partID
    });

    this.setState(
      {
        xmlDocument: doc,
        scoreMetadata,
        repeatRanges,
      },
      () => {
        this.progressAndPlay(true);
      }
    );
  }

  handlePlayButtonClick = () => {
    midiLoadPromise.then(
      () => {
        this.playNotes();
      }
    );
  }

  progressAndPlay(fromStart = false) {
    this.setState((prevState) => {
      const partID = prevState.scoreMetadata.get("parts").keySeq().first();
  
      let nextLeftHandNotes = this.getNextNotes({
        partID: prevState.scoreMetadata.get("parts").keySeq().first(),
        staffNumber: 2,
        lastNote: fromStart ?
          null :
          prevState.lastLeftHandNoteNode,
      });
  
      let nextRightHandNotes = this.getNextNotes({
        partID,
        staffNumber: 1,
        lastNote: fromStart ?
          null :
          prevState.lastRightHandNoteNode,
      });
  
      const state = {};
  
      if (!nextLeftHandNotes && !nextRightHandNotes) {
        return;
      }
  
      if (nextLeftHandNotes !== null) {
        let measureNumber = nextLeftHandNotes.measureNumber;
        let leftHandNotes = nextLeftHandNotes.notes;
        let lastLeftHandNoteNode = nextLeftHandNotes.lastNoteNode;
        let totalDuration = prevState.totalLeftHandDuration + nextLeftHandNotes.duration;
        if (nextLeftHandNotes.crossedRepeat !== null && prevState.repeatCount === 0) {
          state.repeatCount += 1;
          leftHandNotes = nextLeftHandNotes.crossedRepeat.getIn([ "start", "followingNoteNodes", "leftHand" ]).map(
            (node) => noteNodeToName(node)
          );
          lastLeftHandNoteNode = nextLeftHandNotes.crossedRepeat.getIn(["start", "followingNoteNodes", "leftHand"]).last();
          measureNumber = nextLeftHandNotes.crossedRepeat.getIn([ "start", "measureNumber" ]);
        }
        state.leftHandKeys = Set(leftHandNotes);
        state.lastLeftHandNoteNode = lastLeftHandNoteNode;
        state.leftHandMeasureNumber = measureNumber;
        state.totalLeftHandDuration = totalDuration;
      }
  
      if (nextRightHandNotes !== null) {
        let measureNumber = nextRightHandNotes.measureNumber;
        const rightHandNotes = nextRightHandNotes.notes;
        state.rightHandKeys = Set(rightHandNotes);
        state.lastRightHandNoteNode = nextRightHandNotes.lastNoteNode;
        state.rightHandMeasureNumber = measureNumber;
        state.totalRightHandDuration = prevState.totalRightHandDuration + nextRightHandNotes.duration;
      }
  
      return state;
    }, () => this.playNotes());
  }
    
  handleNextNoteButtonClick = () => {
    this.progressAndPlay();
  }

  changeActiveKeys({ keyString, hand }) {
    if (!keyString) {
      this.setState({
        [`${hand}HandKeys`]: Set(),
      });
    }

    const keys = Set(
      keyString.split(/\s*,\s*/).map(
        (noteName) => noteName && (noteName[0].toUpperCase() + (noteName.slice(1) || ""))
      )
    );

    this.setState({
      [`${hand}HandKeys`]: keys,
    });
  }

  handleLeftHandKeysChange = ({ target }) => {
    this.changeActiveKeys({ keyString: target.value, hand: "left" });
  }

  handleRightHandKeysChange = ({ target }) => {
    this.changeActiveKeys({ keyString: target.value, hand: "right" });
  }

  handleMIDIOutputChange = ({ target }) => {
    this.setState({
      midiOutputID: target.value,
    });
  }

  handleKeyPress = ({ noteName }) => {
    this.setState((prevState) => (
      {
        rightHandKeys: prevState.rightHandKeys.add(noteName),
      }
    ));
  }

  handleKeyRelease = ({ noteName }) => {
    this.setState((prevState) => (
      {
        rightHandKeys: prevState.rightHandKeys.remove(noteName),
      }
    ));
  }

  handleDeviceConnected = () => {
    this.setState({
      midiOutputs: WebMIDI.outputs,
    });
  }

  handleDeviceDisconnected = () => {
    this.setState({
      midiOutputs: WebMIDI.outputs,
    });
  }

  render() {
    return (
      <div>
        {
          this.state.midiLoaded && (
            <div>
              <Select
                value={this.state.midiOutputID || ""}
                onChange={this.handleMIDIOutputChange}
                label="MIDI Output"
              >
                {
                  this.state.midiOutputs.map(
                    (output) => (
                      <MenuItem
                        key={output.id}
                        value={output.id}
                      >{output.name}</MenuItem>
                    )
                  )
                }
              </Select>
            </div>
          )
        }
        <Select
          value={this.state.xmlFile || ""}
          onChange={this.handleXMLFileChange}
        >
          {
            Object.keys(xmlFiles).map(
              (fileName) => (
                <MenuItem
                  key={fileName}
                  value={fileName}
                >
                  {fileName.replace(/\.\w*xml$/, "").replace(/^\.\//, "")}
                </MenuItem>
              )
            )
          }
        </Select>
        <Button
          onClick={this.handleLoadXMLButtonClick}
          disabled={!this.state.xmlFile}
        >
          Load
        </Button>
        <div>
          <TextField
            label="Left hand keys:"
            value={this.state.leftHandKeys.join(",")}
            onChange={this.handleLeftHandKeysChange}
          />
          {
            this.state.leftHandMeasureNumber !== null && (
              <span>(measure {this.state.leftHandMeasureNumber})</span>
            )
          }
          {
            this.state.rightHandMeasureNumber !== null && (
              <span>Duration: {this.state.totalLeftHandDuration}</span>
            )
          }
        </div>
        <div>
          <TextField
            label="Right hand keys:"
            value={this.state.rightHandKeys.join(",")}
            onChange={this.handleRightHandKeysChange}
          />
          {
            this.state.rightHandMeasureNumber !== null && (
              <span>(measure {this.state.rightHandMeasureNumber})</span>
            )
          }
          {
            this.state.rightHandMeasureNumber !== null && (
              <span>Duration: {this.state.totalRightHandDuration}</span>
            )
          }
        </div>
        {
          this.state.xmlDocument && (
            <span>
              <IconButton
                onClick={this.handlePlayButtonClick}
                disabled={!this.state.midiLoaded || !this.state.midiOutputID}
              >
                <PlayIcon />
              </IconButton>
              <IconButton
                onClick={this.handleNextNoteButtonClick}
                disabled={!this.state.midiLoaded || !this.state.midiOutputID}
              >
                <SkipNextIcon />
              </IconButton>
            </span>
          )
        }
        <div
          className={this.props.classes.keyboardContainer}
        >
          <Keyboard
            leftHandKeys={this.state.leftHandKeys}
            rightHandKeys={this.state.rightHandKeys}
            onKeyPress={this.handleKeyPress}
            onKeyRelease={this.handleKeyRelease}
          />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(KeyboardTutorial);
  