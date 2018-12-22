import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import { accessWrapper } from "@app/utils/midi/midi-access";

const styles = {
  root: {},

  noteContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
};

class KeyboardCalibrator extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    onRangeSet: PropTypes.func.isRequired,
    inputID: PropTypes.string,
    disabled: PropTypes.bool,
  }

  static defaultProps = {
    disabled: false,
  }

  state = {
    lowNote: null,
    lowNoteName: null,
    highNote: null,
    highNoteName: null,
    inputID: null,
  }

  componentDidMount() {
    if (!this.props.disabled) {
      this.bindEventListeners();
    }
  }

  componentWillUnmount() {
    this.unbindEventListeners();
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.disabled && this.props.disabled) {
      this.unbindEventListeners();
    }
    else if (prevProps.disabled && !this.props.disabled) {
      this.bindEventListeners();
    }
  }

  unbindEventListeners() {
    this.inputs().forEach(
      (input) => {
        accessWrapper.removeInputListener(input, "noteon", "all", this.handleMIDINoteOn);
      }
    );
  }

  bindEventListeners() {
    this.inputs().forEach(
      (input) => {
        accessWrapper.addInputListener(input, "noteon", "all", this.handleMIDINoteOn);
      }
    );
  }

  inputs() {
    if (this.props.inputID) {
      const input = accessWrapper.getInputById(this.props.inputID);

      if (input) {
        return [input];
      }
    }

    return accessWrapper.inputs;
  }

  triggerRangeSetIfNeeded() {
    if (this.state.lowNote !== null && this.state.highNote !== null) {
      this.props.onRangeSet({
        range: [
          this.state.lowNote,
          this.state.highNote,
        ],
        inputID: this.props.inputID || this.state.inputID,
      });
    }
  }

  handleMIDINoteOn = (event) => {
    if (this.state.lowNote === null) {
      this.setState(
        {
          lowNote: event.note.number,
          lowNoteName: `${event.note.name}${event.note.octave}`,
          inputID: event.target.id,
        },
        () => {
          this.triggerRangeSetIfNeeded();
        }
      );
    }
    else if (this.state.highNote === null) {
      this.setState(
        {
          highNote: event.note.number,
          highNoteName: `${event.note.name}${event.note.octave}`,
          inputID: event.target.id,
        },
        () => {
          this.unbindEventListeners();
          this.triggerRangeSetIfNeeded();
        }
      );
    }
  }

  handleRecalibrateButtonClick = () => {
    this.setState({
      lowNote: null,
      lowNoteName: null,
      highNote: null,
      highNoteName: null,
      inputID: null,
    });
    this.unbindEventListeners();
    this.bindEventListeners();
  }

  render() {
    const isCalibrated = this.state.lowNote !== null && this.state.highNote !== null;

    const targetKeyDescription = this.state.lowNote === null ?
      "lowest (left-most)" :
      "highest (right-most)";

    return (
      <div
        className={this.props.classes.root}
      >
        <Typography
          align="center"
          variant="title"
        >
          {
            isCalibrated ? (
              <Button
                onClick={this.handleRecalibrateButtonClick}
              >
                Recalibrate
              </Button>
            ) : `Press the ${targetKeyDescription} key on your keyboard`
          }
        </Typography>
        <div
          className={this.props.classes.noteContainer}
        >
          <div>
            Lowest key: {
              this.state.lowNote === null ?
                null :
                this.state.lowNoteName
            }
          </div>
          <div>
            Highest key: {
              this.state.highNote === null ?
                null :
                this.state.highNoteName
            }
          </div>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(KeyboardCalibrator);
