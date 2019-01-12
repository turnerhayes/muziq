/* global require, process */

import React from "react";
import PropTypes from "prop-types";
import { Set } from "immutable";
import classnames from "classnames";
import WebMIDI from "webmidi";
import Typography from "@material-ui/core/Typography";
import FormGroup from "@material-ui/core/FormGroup";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import { withStyles } from "@material-ui/core/styles";
import { chord as detectChord } from "tonal-detect";

import CleffLines from "@app/utils/midi/CleffLines";
import Keyboard from "@app/components/Keyboard";
import {
  accessWrapper,
  midiLoadPromise,
} from "@app/utils/midi/midi-access";
import partTimeXSLTString from "@app/parttime.xsl";

const MIDDLE_C_MIDI_NUMBER = 60;

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

const styles = {
  keyboardsContainer: {
    display: "flex",
    flexDirection: "column",
  },

  keyboard: {
    flex: "1",
    overflow: "hidden",
  },

  chordDescription: {
    marginLeft: "1em",
  },

  chordName: {
    fontWeight: "bold",
  },

  rightHandKeyboard: {
    marginLeft: "1em",
  },

  middleC: {
    "&::after": {
      content: '"MIDDLE C"',
      display: "inline-block",
      transform: "rotateZ(-90deg)",
      whiteSpace: "nowrap",
      height: "1em",
      position: "relative",
      top: "40%",
      left: "-10%",
    },
  },

  targetWhiteKey: {
    backgroundColor: "yellow",
  },

  correctWhiteKey: {
    backgroundColor: "green",
  },

  incorrectWhiteKey: {
    backgroundColor: "red",
  },
};

class KBTutorial extends React.Component {
  static propTypes = {
    classes: PropTypes.object.isRequired,
  }

  state = {
    xmlFile: null,
    xmlDocument: null,
    repeatCount: 0,
    cleffLines: null,
    minLeftNote: null,
    maxLeftNote: null,
    minRightNote: null,
    maxRightNote: null,
    currentLeftNote: null,
    currentRightNote: null,
    inputs: null,
    pressedKeys: Set(),
  }

  constructor(...args) {
    super(...args);

    this.idString = `kb-tutorial-${Date.now()}`;

    if (process.env.NODE_ENV === "development") {
      window.progressNotes = () => {
        if (!this.state.cleffLines) {
          return;
        }

        this.progressNotes();
      };

      window.playCurrentNotes = () => {
        if (!this.state.cleffLines) {
          return;
        }

        this.setState(
          (prevState) => {
            const leftNoteNames = prevState.currentLeftNote &&
              prevState.currentLeftNote.notes &&
              prevState.currentLeftNote.notes.map((note) => note.name);

            const rightNoteNames = prevState.currentRightNote &&
              prevState.currentRightNote.notes &&
              prevState.currentRightNote.notes.map((note) => note.name);

            return {
              pressedKeys: Set(leftNoteNames).concat(rightNoteNames || []),
            };
          },
          () => {
            this.checkPlayedNotes();
          }
        );
      };
    }
  }

  componentDidMount() {
    midiLoadPromise.then(
      () => {
        this.reloadOutputsAndInputs();

        WebMIDI.addListener("connected", this.handleDeviceConnected);
        WebMIDI.addListener("disconnected", this.handleDeviceDisconnected);
      }
    );
  }

  componentWillUnmount() {
    this.unbindInputListeners();
  }

  bindInputListeners() {
    if (!this.state.inputs) {
      return;
    }
    
    this.state.inputs.forEach(
      (input) => {
        accessWrapper.addInputListener(input, "noteon", "all", this.handleMIDINoteOn);
        accessWrapper.addInputListener(input, "noteoff", "all", this.handleMIDINoteOff);
      }
    );
  }

  unbindInputListeners() {
    if (!this.state.inputs) {
      return;
    }
    
    this.state.inputs.forEach(
      (input) => {
        accessWrapper.removeInputListener(input, "noteon", "all", this.handleMIDINoteOn);
        accessWrapper.removeInputListener(input, "noteoff", "all", this.handleMIDINoteOff);
      }
    );
  }

  handleXMLFileChange = async (event) => {
    const xmlFile = event.target.value || null;

    let xmlDocument = parser.parseFromString(xmlFiles[xmlFile], "application/xml");

    if (xmlDocument.querySelector("score-partwise")) {
      const xsltProcessor = new XSLTProcessor();
      xsltProcessor.importStylesheet(partTimeXSLT);
      xmlDocument = xsltProcessor.transformToDocument(xmlDocument);
    }

    const cleffLines = CleffLines.fromDocument({ xmlDocument });

    let handMins = {
      left: Infinity,
      right: Infinity,
    };
    let handMaxes = {
      left: -Infinity,
      right: -Infinity,
    };

    cleffLines.measures.forEach(
      (measure) => [
        "left",
        "right",
      ].forEach(
        (hand) => measure.items[`${hand}Hand`].forEach(
          (item) => item.notes && item.notes.forEach(
            (note) => {
              if (note.number < handMins[hand]) {
                handMins[hand] = note.number;
              }

              if (note.number > handMaxes[hand]) {
                handMaxes[hand] = note.number;
              }
            }
          )
        )
      )
    );

    const nextNotes = cleffLines.nextNotes();

    let currentLeftNote;
    let currentRightNote;

    if (nextNotes === null) {
      currentLeftNote = null;
    }
    else {
      const { leftHand, rightHand } = nextNotes;

      if (leftHand) {
        currentLeftNote = leftHand;
      }
      
      if (rightHand) {
        currentRightNote = rightHand;
      }
    }

    await midiLoadPromise;

    this.setState({
      xmlFile,
      xmlDocument,
      repeatCount: 0,
      cleffLines,
      minLeftNote: handMins.left,
      maxLeftNote: handMaxes.left,
      minRightNote: handMins.right,
      maxRightNote: handMaxes.right,
      currentLeftNote,
      currentRightNote,
    });
  }

  handleMIDINoteOn = ({ note }) => {
    this.setState(
      (prevState) => ({
        pressedKeys: prevState.pressedKeys.add(note.name + note.octave),
      }),
      () => {
        this.checkPlayedNotes();
      }
    );
  }

  handleMIDINoteOff = ({ note }) => {
    this.setState(
      (prevState) => ({
        pressedKeys: prevState.pressedKeys.delete(note.name + note.octave),
      }),
      () => {
        this.checkPlayedNotes();
      }
    );
  }

  reloadOutputsAndInputs() {
    this.setState(
      {
        inputs: Array.from(accessWrapper.inputs),
      },
      () => {
        this.unbindInputListeners();
        this.bindInputListeners();
      }
    );

  }

  handleDeviceConnected = () => {
    this.reloadOutputsAndInputs();
  }

  handleDeviceDisconnected = () => {
    this.reloadOutputsAndInputs();
  }

  /**
   * Gets the class name(s) for the key represented by the argument
   * 
   * @param {"left"|"right"} hand - the hand keyboard this applies to
   * @param {object} noteArgs - the properties describing the note
   * @param {string} noteArgs.noteName - the name (step + octave) of the note (e.g. "A2")
   * @param {number} noteArgs.key - the MIDI key number
   * @param {boolean} noteArgs.isBlack - whether the note is represented by a black key
   * 
   * @returns {string|undefined} the class name(s) to add, if any
   */
  getKeyClass = (hand) => ({ noteName, key, isBlack }) => {
    const classes = [];

    if (key === MIDDLE_C_MIDI_NUMBER) {
      classes.push(this.props.classes.middleC);
    }

    const isPressed = this.state.pressedKeys.includes(noteName);

    const isLeftKey = !!(
      this.state.currentLeftNote &&
      this.state.currentLeftNote.notes &&
      this.state.currentLeftNote.notes.find(
        (note) => note.name === noteName
      )
    );

    const isRightKey = !!(
      this.state.currentRightNote &&
      this.state.currentRightNote.notes &&
      this.state.currentRightNote.notes.find(
        (note) => note.name === noteName
      )
    );
    
    if (
      (
        hand === "left" &&
        isLeftKey
      ) || (
        hand === "right" &&
        isRightKey
      )
    ) {
      if (isPressed) {
        if (!isBlack) {
          classes.push(this.props.classes.correctWhiteKey);
        }
      }
      else {
        if (!isBlack) {
          classes.push(this.props.classes.targetWhiteKey);
        }
      }
    }
    else {
      if (isPressed) {
        // Not correct for this hand--but maybe correct for the other hand? If so, ignore it
        if (
          !(
            (
              hand === "left" &&
              isRightKey
            ) || (
              hand === "right" &&
              isLeftKey
            )
          )
        ) {
          classes.push(this.props.classes.incorrectWhiteKey);
        }
      }
    }

    return classnames(classes);
  }

  /**
   * Gets a function for determining whether the keyboard should show the key label for the
   * given key.
   * 
   * @param {"left"|"right"} hand - the hand keyboard this applies to
   * @param {object} noteArgs - the properties describing the note
   * @param {string} noteArgs.noteName - the name (step + octave) of the note (e.g. "A2")
   * 
   * @returns {() => boolean} 
   */
  getShouldShowLabel = (hand) => ({ noteName }) => {
    const isLeftKey = !!(
      this.state.currentLeftNote &&
      this.state.currentLeftNote.notes &&
      this.state.currentLeftNote.notes.find(
        (note) => note.name === noteName
      )
    );

    const isRightKey = !!(
      this.state.currentRightNote &&
      this.state.currentRightNote.notes &&
      this.state.currentRightNote.notes.find(
        (note) => note.name === noteName
      )
    );
    
    return (
      hand === "left" &&
      isLeftKey
    ) || (
      hand === "right" &&
      isRightKey
    );
  }

  progressNotes({
    fromStart = false,
    reverse = false
  } = {}) {
    this.setState((prevState) => {
      const state = {};
      const nextNotes = prevState.cleffLines[reverse ? "previousNotes" : "nextNotes"]({
        currentLeftNote: fromStart ? null : prevState.currentLeftNote,
        currentRightNote: fromStart ? null : prevState.currentRightNote,
        repeatCount: prevState.repeatCount
      });

      if (nextNotes === null) {
        state.currentLeftNote = null;
      } else {
        const {
          leftHand,
          rightHand,
          repeated
        } = nextNotes;

        if (leftHand) {
          state.currentLeftNote = leftHand;
        }

        if (rightHand) {
          state.currentRightNote = rightHand;
        }

        if (repeated) {
          state.repeatCount = prevState.repeatCount === 0 ?
            1 :
            0;
        }
      }

      return state;
    });
  }

  checkPlayedNotes() {
    const leftNotes = this.state.currentLeftNote &&
      this.state.currentLeftNote.notes &&
      this.state.currentLeftNote.notes.map((note) => note.name);

    const rightNotes = this.state.currentRightNote &&
      this.state.currentRightNote.notes &&
      this.state.currentRightNote.notes.map((note) => note.name);

    if (
      this.state.pressedKeys.equals(
        Set(leftNotes).union(rightNotes || [])
      )
    ) {
      this.progressNotes();
    }
  }

  render() {
    const xmlFileID = `${this.idString}-file-input`;

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

    return (
      <div>
        <FormGroup
          row
        >
          <FormControl>
            <InputLabel
              htmlFor={xmlFileID}
            >
              File
            </InputLabel>
            <Select
              id={xmlFileID}
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
          </FormControl>
        </FormGroup>
        <div
          className={this.props.classes.keyboardsContainer}
        >
          <div
            className={this.props.classes.keyboard}
          >
            <Keyboard
              scrollToLowestKeyOnChange
              activeKeys={this.state.pressedKeys}
              getKeyClass={this.getKeyClass("left")}
              getShouldShowLabel={this.getShouldShowLabel("left")}
              lowestKeyNumber={Math.max(0, this.state.minLeftNote)}
              highestKeyNumber={this.state.maxLeftNote}
            />
            <Typography
              align="center"
              variant="caption"
            >
              Left hand
              {
                leftHandChordName && (
                  <span className={this.props.classes.chordDescription}>
                    (<span className={this.props.classes.chordName}>{leftHandChordName}</span> chord)
                  </span>
                )
              }
            </Typography>
          </div>
          <div
            className={classnames(
              this.props.classes.keyboard,
              this.props.classes.rightHandKeyboard
            )}
          >
            <Keyboard
              scrollToLowestKeyOnChange
              activeKeys={this.state.pressedKeys}
              getKeyClass={this.getKeyClass("right")}
              getShouldShowLabel={this.getShouldShowLabel("right")}
              lowestKeyNumber={MIDDLE_C_MIDI_NUMBER}
              highestKeyNumber={this.state.maxRightNote}
            />
            <Typography
              align="center"
              variant="caption"
            >
              Right hand
              {
                rightHandChordName && (
                  <span className={this.props.classes.chordDescription}>
                    (<span className={this.props.classes.chordName}>{rightHandChordName}</span> chord)
                  </span>
                )
              }
            </Typography>
          </div>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(KBTutorial);
