/* global require */

import React from "react";
import PropTypes from "prop-types";
import localForage from "localforage";
import { Set, Map, fromJS } from "immutable";
import { withStyles } from "@material-ui/core/styles";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import PlayIcon from "@material-ui/icons/PlayArrow";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import WebMIDI from "webmidi";
import { chord as detectChord } from "tonal-detect";

import Keyboard from "@app/components/Keyboard";
import KeyboardCalibrator from "@app/components/KeyboardCalibrator";
import FakeMIDIKeyboard from "@app/components/FakeMIDIKeyboard";
import partTimeXSLTString from "@app/parttime.xsl";
import {
  accessWrapper,
  midiLoadPromise,
} from "@app/utils/midi/midi-access";

import CleffLines from "../../utils/midi/CleffLines";
import MIDIMessageLog from "../MIDIMessageLog";
import FakeMIDIInput from "@app/utils/midi/FakeMIDIInput";


const req = require.context("../../musicxml", true, /\.(\w*)xml$/);
const xmlFiles = req.keys().reduce(
  (files, fileName) => {
    files[fileName] = req(fileName);

    return files;
  },
  {}
);

const parser = new DOMParser();

const partTimeXSLT = parser.parseFromString(partTimeXSLTString, "application/xml");

const XML_FILE_STORAGE_KEY = "KeyboardTutorial_xmlFile";

const MIDI_OUTPUT_STORAGE_KEY = "KeyboardTutorial_midiOutputID";

const MIDI_INPUT_STORAGE_KEY = "KeyboardTutorial_midiInputID";

const styles = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  keyboardCalibratorContainer: {
    display: "flex",
    alignItems: "center",
  },

  keyboardCalibrator: {
    width: "100%",
  },

  chordName: {
    marginLeft: "1em",
  },

  keyboardContainer: {
    // overflowX: "auto",
  },

  midiPanel: {
    flexDirection: "column",
  },

  midiInputOptionsContainer: {
    display: "flex",
  },

  inputCheckboxes: {
    display: "inline-flex",
    flexDirection: "column",
  },

  midiMessagesContainer: {
    flex: 1,
  },
};

class KeyboardTutorial extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
  }

  state = {
    xmlFile: null,
    xmlDocument: null,
    midiOutputID: null,
    midiInputID: null,
    midiOutputs: null,
    midiInputs: null,
    useAllOutputs: true,
    useAllInputs: true,
    midiLoaded: false,
    scoreMetadata: Map(),
    repeatCount: 0,
    cleffLines: null,
    currentLeftNote: null,
    currentRightNote: null,
    midiMessages: [],
    isListeningToInputs: true,
    midiKeys: Set(),
    keyRange: null,
    isCalibrating: false,
  }

  constructor(...args) {
    super(...args);

    localForage.getItem(XML_FILE_STORAGE_KEY).then(
      (value) => {
        if (value) {
          this.setState({
            xmlFile: value,
          });
        }
      }
    );

    localForage.getItem(MIDI_OUTPUT_STORAGE_KEY).then(
      (value) => {
        if (value) {
          const state = {
            midiOutputID: value,
          };

          if (!this._hasChangedUsAllOutputs) {
            state.useAllOutputs = false;
          }

          this.setState(
            state,
            () => {
              this.unbindInputListeners();
              this.bindInputListeners();
            }
          );
        }
      }
    );

    localForage.getItem(MIDI_INPUT_STORAGE_KEY).then(
      (value) => {
        if (value) {
          const state = {
            midiInputID: value,
          };

          if (!this._hasChangedUsAllInputs) {
            state.useAllInputs = false;
          }

          this.setState(
            state,
            () => {
              this.unbindInputListeners();
              this.bindInputListeners();
            }
          );
        }
      }
    );
  }

  bindInputListeners() {
    if (this.state.isCalibrating) {
      return;
    }

    if (!this.state.midiInputs) {
      return;
    }
    
    this.inputs().forEach(
      (input) => {
        accessWrapper.addInputListener(input, "noteon", "all", this.handleMIDINoteOn);
        accessWrapper.addInputListener(input, "noteoff", "all", this.handleMIDINoteOff);
      }
    );
  }

  unbindInputListeners() {
    if (!this.state.midiInputs) {
      return;
    }
    
    this.state.midiInputs.forEach(
      (input) => {
        accessWrapper.removeInputListener(input, "noteon", "all", this.handleMIDINoteOn);
        accessWrapper.removeInputListener(input, "noteoff", "all", this.handleMIDINoteOff);
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
  }
  
  componentDidUpdate(prevProps, prevState) {
    if (!this.state.midiLoaded) {
      this.setMIDILoaded();
    }

    if (prevState.isCalibrating && !this.state.isCalibrating) {
      this.bindInputListeners();
    }
    else if (!prevState.isCalibrating && this.state.isCalibrating) {
      this.unbindInputListeners();
    }
  }
  
  componentWillUnmount() {
    WebMIDI.removeListener("connected", this.handleDeviceConnected);
    WebMIDI.removeListener("disconnected", this.handleDeviceDisconnected);
    
    this.unbindInputListeners();
  }

  getCleffLines({ xmlDocument, partID }) {
    const lines = CleffLines.fromDocument({ xmlDocument, partID });
    
    this.setState({
      cleffLines: lines,
    });
  }
  
  setMIDILoaded() {
    if (WebMIDI.enabled) {
      this.setState({
        midiLoaded: true,
        midiOutputs: Array.from(accessWrapper.outputs),
        midiInputs: Array.from(accessWrapper.inputs),
      });

      this.unbindInputListeners();

      if (this.state.isListeningToInputs) {
        this.bindInputListeners();
      }

      return;
    }

    midiLoadPromise.then(
      () => {
        this.setState({
          midiLoaded: true,
          midiOutputs: Array.from(accessWrapper.outputs),
          midiInputs: Array.from(accessWrapper.inputs),
        });

        this.unbindInputListeners();

        if (this.state.isListeningToInputs) {
          this.bindInputListeners();
        }
      }
    );
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

  playNotes({ playLeft = true, playRight = true } = {}) {
    const part = this.state.scoreMetadata.get("parts").first();

    const DEFAULT_CHANNEL = 1;

    const notesPlayed = {};

    if (playLeft && !this.state.currentLeftNote.isRest) {
      const notes = this.state.currentLeftNote.notes.map(
        ({ name }) => name
      );

      notesPlayed.left = notes;
      
      this.outputs().forEach(
        (output) => output.playNote(
          notes,
          part.getIn(
            [ "midi", "channel" ],
            DEFAULT_CHANNEL
          )
        )
      );
    }

    if (playRight && !this.state.currentRightNote.isRest) {
      const notes = this.state.currentRightNote.notes.map(
        ({ name }) => name
      );

      notesPlayed.right = notes;

      this.outputs().forEach(
        (output) => output.playNote(
          notes,
          part.getIn(
            [ "midi", "channel" ],
            DEFAULT_CHANNEL
          )
        )
      );
    }
  }

  outputs() {
    if (!WebMIDI.enabled) {
      return [];
    }

    if (this.state.useAllOutputs) {
      return this.state.midiOutputs;
    }

    if (!this.state.midiOutputID) {
      return [];
    }

    const output = accessWrapper.getOutputById(this.state.midiOutputID);

    if (!output) {
      return [];
    }

    return [ output ]; 
  }

  inputs() {
    if (!WebMIDI.enabled) {
      return [];
    }

    if (this.state.useAllInputs) {
      return this.state.midiInputs;
    }

    if (!this.state.midiInputID) {
      return [];
    }

    const input = accessWrapper.getInputById(this.state.midiInputID);

    if (!input) {
      return [];
    }

    return [ input ];
  }

  progressAndPlay({ fromStart = false, reverse = false } = {}) {
    let playLeft = false;
    let playRight = false;

    this.setState((prevState) => {
      const state = {};
      const nextNotes = prevState.cleffLines[reverse ? "previousNotes" : "nextNotes"]({
        currentLeftNote: fromStart ? null : prevState.currentLeftNote,
        currentRightNote: fromStart ? null : prevState.currentRightNote,
        repeatCount: prevState.repeatCount
      });

      if (nextNotes === null) {
        state.currentLeftNote = null;
      }
      else {
        const { leftHand, rightHand, repeated } = nextNotes;
  
        if (leftHand) {
          state.currentLeftNote = leftHand;
          playLeft = true;
        }
  
        if (rightHand) {
          state.currentRightNote = rightHand;
          playRight = true;
        }

        if (repeated) {
          state.repeatCount = prevState.repeatCount + 1;
        }
      }

      return state;
    }, () => this.playNotes({
      playLeft,
      playRight,
    }));
  }

  checkPlayedNotes() {
    if (this.state.currentLeftNote === null || this.state.currentRightNote === null) {
      return;
    }

    const leftHandKeys = Set(this.state.currentLeftNote.notes.map((note) => note.name));
    const rightHandKeys = Set(this.state.currentRightNote.notes.map((note) => note.name));
    if (this.state.midiKeys.equals(leftHandKeys.union(rightHandKeys))) {
      this.progressAndPlay();
    }
  }

  handleXMLFileChange = (event) => {
    const xmlFile = event.target.value || null;

    this.setState({
      xmlFile,
    });

    if (xmlFile === null) {
      localForage.removeItem(XML_FILE_STORAGE_KEY);
    }
    else {
      localForage.setItem(XML_FILE_STORAGE_KEY, xmlFile);
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
        () => this.outputs().forEach(
          (output) => output.sendProgramChange(programNumber, channel)
        )
      );
    }

    this.setState(
      {
        xmlDocument: doc,
        scoreMetadata,
        repeatCount: 0,
        cleffLines: CleffLines.fromDocument({ xmlDocument: doc, partID, }),
      },
      () => {
        this.progressAndPlay({ fromStart: true });
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
 
  handleNextNoteButtonClick = () => {
    this.progressAndPlay();
  }
 
  handlePreviousNoteButtonClick = () => {
    this.progressAndPlay({ reverse: true });
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
    const midiOutputID = target.value;

    this.setState({
      midiOutputID,
    });

    localForage.setItem(MIDI_OUTPUT_STORAGE_KEY, midiOutputID);
  }

  handleMIDIInputChange = ({ target }) => {
    const midiInputID = target.value;

    this.setState({
      midiInputID,
    });

    localForage.setItem(MIDI_INPUT_STORAGE_KEY, midiInputID);
  }

  handleMIDINoteOn = ({ note }) => {
    const noteName = `${note.name}${note.octave}`;

    this.setState(
      (prevState) => ({
        midiKeys: prevState.midiKeys.add(noteName),
      }),
      () => this.checkPlayedNotes()
    );
  }

  handleMIDINoteOff = ({ note }) => {
    const noteName = `${note.name}${note.octave}`;

    this.setState(
      (prevState) => ({
        midiKeys: prevState.midiKeys.delete(noteName),
      }),
      () => this.checkPlayedNotes()
    );
  }

  reloadOutputsAndInputs() {
    this.setState({
      midiOutputs: Array.from(accessWrapper.outputs),
      midiInputs: Array.from(accessWrapper.inputs),
    });

    this.unbindInputListeners();

    if (this.state.isListeningToInputs) {
      this.bindInputListeners();
    }
  }

  handleDeviceConnected = () => {
    this.reloadOutputsAndInputs();
  }

  handleDeviceDisconnected = () => {
    this.reloadOutputsAndInputs();
  }

  handleUseAllOutputsChange = (event) => {
    this._hasChangedUsAllOutputs = true;

    this.setState({
      useAllOutputs: event.target.checked,
    });
  }

  handleUseAllInputsChange = (event) => {
    this._hasChangedUsAllInputs = true;

    this.setState({
      useAllInputs: event.target.checked,
    });
  }

  handleListenToInputsChange = (event) => {
    this.setState(
      {
        isListeningToInputs: event.target.checked,
      },
      () => {
        this.unbindInputListeners();
        
        if (this.state.isListeningToInputs) {
          this.bindInputListeners();
        }
      }
    );
  }

  handleCalibratorRangeSet = ({ range, inputID }) => {
    this.setState(
      (prevState) => {
        const state = {
          keyRange: range,
        };

        if (!prevState.midiInputID) {
          state.midiInputID = inputID;
          state.useAllInputs = false;
        }

        return state;
      }
    );
  }

  handleCalbratorButtonClick = () => {
    this.setState(
      (prevState) => {
        return {
          isCalibrating: !prevState.isCalibrating,
        };
      }
    );
  }

  render() {
    const canPlay = this.state.midiLoaded && (
      (
        this.state.useAllOutputs && this.state.midiOutputs.length > 0
      ) || (
        this.state.midiOutputID
      )
    );

    let leftHandChordName = this.state.currentLeftNote && !this.state.currentLeftNote.isRest ?
      detectChord(this.state.currentLeftNote.notes.map(({ name }) => name)) :
      null;

    if (leftHandChordName && leftHandChordName.length > 0) {
      // found chord(s)--use the first one (arbitrary choice)
      leftHandChordName = leftHandChordName[0];
    }
    else {
      leftHandChordName = null;
    }
    
    let rightHandChordName = this.state.currentRightNote && !this.state.currentRightNote.isRest ?
      detectChord(this.state.currentRightNote.notes.map(({ name }) => name)) :
      null;
    
    if (rightHandChordName && rightHandChordName.length > 0) {
      rightHandChordName = rightHandChordName[0];
    }
    else {
      rightHandChordName = null;
    }

    const activeKeys = Set(
      this.state.currentLeftNote &&
      this.state.currentLeftNote.notes &&
      this.state.currentLeftNote.notes.map(
        ({ name }) => name
      ) ||
      undefined
    ).concat(
      this.state.currentRightNote &&
      this.state.currentRightNote.notes &&
      this.state.currentRightNote.notes.map(
        ({ name }) => name
      ) ||
      undefined
    );

    return (
      <div
        className={this.props.classes.root}
      >
        <div>
          <ExpansionPanel
            expanded={this.state.isCalibrating}
            onChange={this.handleCalbratorButtonClick}
          >
            <ExpansionPanelSummary
              expandIcon={<ExpandMoreIcon />}
            >
              Keyboard Calibration
            </ExpansionPanelSummary>
            <ExpansionPanelDetails
              classes={{
                root: this.props.classes.keyboardCalibratorContainer,
              }}
            >
              <KeyboardCalibrator
                classes={{
                  root: this.props.classes.keyboardCalibrator,
                }}
                onRangeSet={this.handleCalibratorRangeSet}
                disabled={!this.state.isCalibrating}
              />
            </ExpansionPanelDetails>
          </ExpansionPanel>
          {
            this.state.midiLoaded && (
              <ExpansionPanel>
                <ExpansionPanelSummary
                  expandIcon={<ExpandMoreIcon />}
                >
                  MIDI Settings
                </ExpansionPanelSummary>
                <ExpansionPanelDetails
                  classes={{
                    root: this.props.classes.midiPanel,
                  }}
                >
                  <div>
                    <FormControl>
                      <FormControlLabel
                        label="MIDI Output"
                        labelPlacement="start"
                        control={
                          <Select
                            value={this.state.midiOutputID || ""}
                            onChange={this.handleMIDIOutputChange}
                            disabled={this.state.useAllOutputs}
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
                        }
                      />
                    </FormControl>

                    <FormControlLabel
                      label="Use all outputs"
                      control={
                        <Checkbox
                          checked={this.state.useAllOutputs}
                          onChange={this.handleUseAllOutputsChange}
                        />
                      }
                    />
                  </div>
                  <div
                    className={this.props.classes.midiInputOptionsContainer}
                  >
                    <FormControlLabel
                      label="MIDI Input"
                      labelPlacement="start"
                      margin="none"
                      control={
                        <Select
                          value={this.state.midiInputID || ""}
                          onChange={this.handleMIDIInputChange}
                          disabled={this.state.useAllInputs}
                        >
                          {
                            this.state.midiInputs.map(
                              (input) => (
                                <MenuItem
                                  key={input.id}
                                  value={input.id}
                                >{input.name}</MenuItem>
                              )
                            )
                          }
                        </Select>
                      }
                    />

                    <FormGroup
                      className={this.props.classes.inputCheckboxes}
                    >
                      <FormControlLabel
                        label="Use all inputs"
                        control={
                          <Checkbox
                            checked={this.state.useAllInputs}
                            onChange={this.handleUseAllInputsChange}
                          />
                        }
                      />
                      <FormControlLabel
                        label="Listen to inputs"
                        control={
                          <Checkbox
                            checked={this.state.isListeningToInputs}
                            onChange={this.handleListenToInputsChange}
                          />
                        }
                      />
                    </FormGroup>
                  </div>
                </ExpansionPanelDetails>
              </ExpansionPanel>
            )
          }
          <div>
            <FormControlLabel
              label="Song"
              labelPlacement="start"
              control={
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

              }
            />
            <Button
              onClick={this.handleLoadXMLButtonClick}
              disabled={!this.state.xmlFile}
            >
              Load
            </Button>
          </div>
          {
            !this.state.midiKeys.isEmpty() && (
              <div>
                Pressed keys: { this.state.midiKeys.join(", ") }
              </div>
            )
          }
          <div>
            <TextField
              label="Left hand keys:"
              value={
                (
                  !this.state.currentLeftNote ||
                  this.state.currentLeftNote.isRest
                ) ?
                  "" :
                  this.state.currentLeftNote.notes.map(
                    ({ name }) => name
                  ).join(", ")
              }
              onChange={this.handleLeftHandKeysChange}
            />
            {
              leftHandChordName && (
                <span
                  className={this.props.classes.chordName}
                >
                  Chord name: {leftHandChordName}
                </span>
              )
            }
          </div>
          <div>
            <TextField
              label="Right hand keys:"
              value={
                (
                  !this.state.currentRightNote ||
                  this.state.currentRightNote.isRest
                ) ?
                  "" :
                  this.state.currentRightNote.notes.map(
                    ({ name }) => name
                  ).join(", ")
              }
              onChange={this.handleRightHandKeysChange}
            />
            {
              rightHandChordName && (
                <span
                  className={this.props.classes.chordName}
                >
                  Chord name: {rightHandChordName}
                </span>
              )
            }
          </div>
          {
            this.state.xmlDocument && (
              <span>
                <IconButton
                  onClick={this.handlePreviousNoteButtonClick}
                  disabled={!canPlay}
                >
                  <SkipPreviousIcon />
                </IconButton>
                <IconButton
                  onClick={this.handlePlayButtonClick}
                  disabled={!canPlay}
                >
                  <PlayIcon />
                </IconButton>
                <IconButton
                  onClick={this.handleNextNoteButtonClick}
                  disabled={!canPlay}
                >
                  <SkipNextIcon />
                </IconButton>
              </span>
            )
          }
        </div>
        <div
          className={this.props.classes.keyboardContainer}
        >
          <Keyboard
            activeKeys={activeKeys}
            lowestKeyNumber={this.state.keyRange && this.state.keyRange[0]}
            highestKeyNumber={this.state.keyRange && this.state.keyRange[1]}
          />
        </div>

        {
          this.state.midiInputID === FakeMIDIInput.id ?
            (
              <FakeMIDIKeyboard
              />
            ) :
            null
        }

        <MIDIMessageLog
          inputID={this.state.useAllInputs ? undefined : this.state.midiInputID}
          isListening={this.state.isListeningToInputs}
          classes={{
            root: this.props.classes.midiMessagesContainer,
          }}
        />
      </div>
    );
  }
}

export default withStyles(styles)(KeyboardTutorial);
  