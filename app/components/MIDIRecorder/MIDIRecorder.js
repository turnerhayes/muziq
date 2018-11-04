/* global Promise, Map, Uint8Array */

import React from "react";
import PropTypes from "prop-types";
import { List } from "immutable";

import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import PlayIcon from "@material-ui/icons/PlayCircleFilled";
import StopIcon from "@material-ui/icons/Stop";
import PauseIcon from "@material-ui/icons/PauseCircleFilled";

import sampleMIDIMessages from "./sample-messages.json";

const styles = {
  recordingButtonRecording: {
    color: "red",
  },
};

const midiPromise = new Promise(
  (resolve, reject) => {
    if (typeof navigator.requestMIDIAccess !== "function") {
      reject();

      return;
    }

    navigator.requestMIDIAccess()
      .then(
        (access) => {
          resolve(access);
        }
      ).catch(reject);
  }
);

window._midimessages = [];

window.serializeMIDIMessages = function() {
  return JSON.stringify(
    window._midimessages,
    null,
    "  "
  );
};

class MIDIRecorder extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
  }

  state = {
    MIDIAccess: null,
    isRecording: false,
    isPlaying: false,
    inputs: new Map(),
    outputs: new Map(),
    currentInput: null,
    currentOutput: null,
    messages: List(),
  }

  componentDidMount() {
    midiPromise.then(
      (access) => {
        const state = {
          MIDIAccess: access,
          inputs: Map.from(access.inputs),
          outputs: Map.from(access.outputs),
        };

        const inputKeys = Array.from(state.inputs.keys());

        state.currentInput = inputKeys[inputKeys.length - 1];

        const outputKeys = Array.from(state.outputs.keys());

        state.currentOutput = outputKeys[outputKeys.length - 1];

        this.setState(state);

        access.addEventListener(
          "statechange",
          this.handleMIDIStateChange,
          false
        );
      }
    ).catch(
      () => this.setState({
        MIDIAccess: false,
      })
    );
  }

  componentWillUnmount() {
    if (this.state.MIDIAccess) {
      this.state.MIDIAccess.removeEventListener(
        "statechange",
        this.handleMIDIStateChange
      );
    }
  }

  handleMIDIStateChange = (event) => {
    this.setState((prevState) => {
      const state = {
        inputs: Map.from(event.target.inputs),
        outputs: Map.from(event.target.outputs),
      };

      if (prevState.currentInput === null) {
        const keys = state.inputs.keys();

        state.currentInput = keys[keys.length - 1];
      }

      if (prevState.currentOutput === null) {
        const keys = state.outputs.keys();

        state.currentOutput = keys[keys.length - 1];
      }
    });
  }

  MIDIMessageListener = (message) => {
    const messageObj = {
      isTrusted: true,
      data: Array.from(message.data),
      type: "midimessage",
      delta: window.performance.now() - this.lastTimeStamp,
    };
    window._midimessages.push(messageObj);
    this.setState((prevState) => {
      return {
        messages: prevState.messages.push(messageObj),
      };
    });
  }

  listenForMessages() {
    if (this.state.inputs.has(this.state.currentInput)) {
      this.lastTimeStamp = window.performance.now();

      this.state.inputs.get(this.state.currentInput).addEventListener(
        "midimessage",
        this.MIDIMessageListener
      );
    }
  }

  stopListeningForMessages() {
    this.lastTimeStamp = null;

    if (this.state.inputs.has(this.state.currentInput)) {
      this.state.inputs.get(this.state.currentInput).removeEventListener(
        "midimessage",
        this.MIDIMessageListener
      );
    }
  }

  handleRecordButtonClick = () => {
    this.setState((prevState) => {
      const isRecording = !prevState.isRecording;

      if (isRecording) {
        this.listenForMessages();
      }
      else {
        this.stopListeningForMessages();
      }

      return {
        isRecording,
      };
    });
  }

  play() {
    let index = 0;
    const output = this.state.outputs.get(this.state.currentOutput);

    const playLoop = () => {
      const message = this.state.messages.get(index++);

      if (!message.data) {
        return;
      }

      output.send(message.data);

      if (index < this.state.messages.size - 1) {
        // eslint-disable-next-line no-magic-numbers
        setTimeout(playLoop, 1000);
      }
      else {
        this.setState({
          isPlaying: false,
        });
      }
    };

    // eslint-disable-next-line no-magic-numbers
    setTimeout(playLoop, 1000);
  }

  handlePlayButtonClick = () => {
    this.stopListeningForMessages();

    this.setState({
      isPlaying: true,
      isRecording: false,
    });

    this.play();
  }

  handleStopButtonClick = () => {
    this.setState({
      isPlaying: false,
    });
  }
  
  handlePauseButtonClick = () => {
    this.setState({
      isPlaying: false,
    });
  }

  handleInputSelectChange = ({ target }) => {
    this.stopListeningForMessages();

    this.setState({
      currentInput: target.value,
    });
  }

  handleLoadSampleMIDIButtonClick = () => {
    this.setState({
      messages: new List(
        sampleMIDIMessages.map(
          (message) => new MIDIMessageEvent("midimessage", {
            data: Uint8Array.from(message.data),
            isTrusted: message.isTrusted,
          })
        )
      ),
    });
  }

  render() {
    if (!this.state.MIDIAccess) {
      return null;
    }

    return (
      <div>
        <div>
          <div>
            <label>
              Input:
              <select
                disabled={this.state.inputs.entries().length === 0}
                onChange={this.handleInputSelectChange}
                defaultValue={this.state.currentInput}
              >
                {
                  Array.from(this.state.inputs.keys()).map(
                    (id) => (
                      <option
                        key={id}
                        value={
                          id
                        }
                      >{this.state.inputs.get(id).name}</option>
                    )
                  )
                }
              </select>
            </label>
          </div>
          <div>
            <label>
              Output:
              <select
                disabled={this.state.outputs.entries().length === 0}
                defaultValue={this.state.currentOutput}
              >
                {
                  Array.from(this.state.outputs.keys()).map(
                    (id) => (
                      <option
                        key={id}
                        value={id}
                      >{this.state.outputs.get(id).name}</option>
                    )
                  )
                }
              </select>
            </label>
          </div>
        </div>
        <div>
          <IconButton
            onClick={this.handleRecordButtonClick}
            className={
              this.state.isRecording ?
                this.props.classes.recordingButtonRecording :
                undefined
            }
          >
            <FiberManualRecordIcon
            />
          </IconButton>
          {
            this.state.isPlaying ? (
              <IconButton
                onClick={this.handlePauseButtonClick}
              >
                <PauseIcon
                />
              </IconButton>
            ) : (
              <IconButton
                onClick={this.handlePlayButtonClick}
                disabled={this.state.messages.isEmpty()}
              >
                <PlayIcon
                />
              </IconButton>
            )
          }
          <IconButton
            onClick={this.handleStopButtonClick}
            disabled={!this.state.isPlaying}
          >
            <StopIcon
            />
          </IconButton>
        </div>
        <div>{this.state.messages.size} messages</div>
        <Button
          onClick={this.handleLoadSampleMIDIButtonClick}
        >
          Load sample MIDI
        </Button>
      </div>
    );
  }
}

export default withStyles(styles)(MIDIRecorder);
