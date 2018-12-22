import React from "react";
import PropTypes from "prop-types";
import { List as ImmutableList } from "immutable";
import { withStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import IconButton from "@material-ui/core/IconButton";
import RootRef from "@material-ui/core/RootRef";
import ClearIcon from "@material-ui/icons/Clear";
import LastPageIcon from "@material-ui/icons/LastPage";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import WebMIDI from "webmidi";

import { midiLoadPromise, accessWrapper } from "@app/utils/midi/midi-access";

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
  },

  content: {
    display: "flex",
    flex: 1,
    overflowY: "auto",
  },
  
  list: {
  },
};

const INPUT_EVENTS = [
  "activesensing",
  "channelaftertouch",
  "channelmode",
  "clock",
  "continue",
  "controlchange",
  "keyaftertouch",
  "noteoff",
  "noteon",
  "pitchbend",
  "programchange",
  "reset",
  "songposition",
  "songselect",
  "start",
  "stop",
  "sysex",
  "timecode",
  "tuningrequest",
  "unknownsystemmessage",
];

class MIDIMessageLog extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    inputID: PropTypes.string,
    isListening: PropTypes.bool.isRequired,
  }

  static defaultProps = {
    isListening: true,
    isPaused: false,
  }

  state = {
    midiMessages: ImmutableList(),
    midiInputs: ImmutableList(),
  }

  contentRef = React.createRef()

  componentDidMount() {
    midiLoadPromise.then(
      () => {
        WebMIDI.addListener("connected", this.handleDeviceConnected);
        WebMIDI.addListener("disconnected", this.handleDeviceDisconnected);

        this.setState({
          midiInputs: ImmutableList(accessWrapper.inputs),
        }, () => {
          this.bindInputListeners();
        });
    
      }
    );
  }

  componentWillUnmount() {
    this.unbindInputListeners();
    WebMIDI.removeListener("connected", this.handleDeviceConnected);
    WebMIDI.removeListener("disconnected", this.handleDeviceDisconnected);
  }

  componentDidUpdate(prevProps) {
    let shouldBind = false;
    let shouldUnbind = false;

    if (prevProps.isListening !== this.props.isListening) {
      this.unbindInputListeners();
      shouldUnbind = true;
      
      if (this.props.isListening) {
        shouldBind = true;
      }
    }

    if (prevProps.inputID !== this.props.inputID) {
      shouldUnbind = true;
      shouldBind = true;
    }

    if (shouldUnbind) {
      this.unbindInputListeners();
    }

    if (shouldBind) {
      this.bindInputListeners();
    }
  }

  bindInputListeners() {
    if (!this.state.midiInputs) {
      return;
    }

    this.inputs().forEach(
      (input) => INPUT_EVENTS.forEach(
        (event) => {
          accessWrapper.addInputListener(input, event, "all", this.handleMIDIEvent);
        }
      )
    );
  }

  unbindInputListeners() {
    if (!this.state.midiInputs) {
      return;
    }

    this.state.midiInputs.forEach(
      (input) => INPUT_EVENTS.forEach(
        (event) => {
          accessWrapper.removeInputListener(input, event, "all", this.handleMIDIEvent);
        }
      )
    );
  }

  inputs() {
    if (this.props.inputID) {
      const input = accessWrapper.getInputById(this.props.inputID);

      if (input) {
        return ImmutableList([input]);
      }

      return ImmutableList();
    }

    return this.state.midiInputs;
  }

  scrollListToBottom() {
    if (this.contentRef.current) {
      this.contentRef.current.scrollTop = this.contentRef.current.scrollHeight;
    }
  }

  handleMIDIEvent = ({ type, target, ...args }) => {
    const MAX_ITEMS = 30;
    this.setState((prevState) => {
      const state = {
        midiMessages: prevState.midiMessages.push(
          {
            type,
            inputName: target.name,
            ...args,
          }
        ).slice(-1 * MAX_ITEMS),
      };

      return state;
    });
  }

  reloadInputs() {
    this.setState(
      {
        midiInputs: ImmutableList(accessWrapper.inputs),
      },
      () => {
        this.unbindInputListeners();
    
        if (this.state.isListeningToInputs) {
          this.bindInputListeners();
        }
      }
    );
  }

  updateListeners() {
    this.unbindInputListeners();

    if (!this.state.isPaused && this.props.isListening) {
      this.bindInputListeners();
    }
  }

  handleDeviceConnected = () => {
    this.reloadInputs();
  }

  handleDeviceDisconnected = () => {
    this.reloadInputs();
  }

  handleClearButtonClick = () => {
    this.setState({
      midiMessages: ImmutableList(),
    });
  }

  handleScrollToEndButtonClick = () => {
    this.scrollListToBottom();
  }

  handlePauseButtonClick = () => {
    this.setState(
      (prevState) => ({
        isPaused: !prevState.isPaused,
      }),
      () => this.updateListeners()
    );
  }

  render() {
    return (
      <Card
        className={this.props.classes.root}
      >
        <CardHeader
          title="MIDI Message log"
          action={
            <div>
              <IconButton
                onClick={this.handlePauseButtonClick}
                title={`${this.state.isPaused ? "Start" : "Stop"} listening`}
              >
                {
                  this.state.isPaused ?
                    (
                      <PlayArrowIcon />
                    ) : (
                      <PauseIcon />
                    )
                }
              </IconButton>

              <IconButton
                onClick={this.handleScrollToEndButtonClick}
                title="Scroll to end"
              >
                <LastPageIcon />
              </IconButton>

              <IconButton
                onClick={this.handleClearButtonClick}
                title="Clear log"
              >
                <ClearIcon />
              </IconButton>
            </div>
          }
        />
        <RootRef
          rootRef={this.contentRef}
        >
          <CardContent
            classes={{
              root: this.props.classes.content,
            }}
          >
            {
              !this.state.midiMessages.isEmpty() && (
                <List
                  classes={{
                    root: this.props.classes.list,
                  }}
                >
                  {
                    this.state.midiMessages.map(
                      (message, index) => (
                        <ListItem
                          key={index}
                          divider
                        >
                          {JSON.stringify(message)}
                        </ListItem>
                      )
                    )
                  }
                </List>
              )
            }
          </CardContent>
        </RootRef>
      </Card>
    );
  }
}

export default withStyles(styles)(MIDIMessageLog);
