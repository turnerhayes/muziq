import React from "react";
import PropTypes from "prop-types";
import { Set } from "immutable";
import { withStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import IconButton from "@material-ui/core/IconButton";
import ClearPressedKeysIcon from "@material-ui/icons/Close";

import Keyboard from "@app/components/Keyboard";
import FakeMIDIInput from "@app/utils/midi/FakeMIDIInput";

const styles = {
  toggleButton: {
    fontSize: "1.8em",
  },
};
class FakeMIDIKeyboard extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    minKeyNumber: PropTypes.number,
    maxKeyNumber: PropTypes.number,
    middleCClass: PropTypes.string,
  }

  state = {
    pressedKeys: Set(),
    isShown: false,
  }

  getKeyClass = ({ key }) => {
    if (key === 60 && this.props.middleCClass) {
      return this.props.middleCClass;
    }
  }

  handleKeyPress = ({ key, noteName }) => {
    this.setState((prevState) => {
      if (prevState.pressedKeys.includes(noteName)) {
        FakeMIDIInput.sendNoteOff(key);
        return {
          pressedKeys: prevState.pressedKeys.delete(noteName),
        };
      }
      else {
        FakeMIDIInput.sendNoteOn(key);
        return {
          pressedKeys: prevState.pressedKeys.add(noteName),
        };
      }
    });
  }

  handleClearPressedKeysButtonClick = () => {
    this.setState(
      (prevState) => {
        FakeMIDIInput.sendNoteOff(prevState.pressedKeys.toArray());

        return {
          pressedKeys: Set(),
        };
      }
    );
  }

  handleToggleButtonClick = () => {
    this.setState(
      (prevState) => ({
        isShown: !prevState.isShown,
      })
    );
  }

  render() {
    return (
      <Card>
        <CardHeader
          action={
            <div>
              {
                this.state.isShown && !this.state.pressedKeys.isEmpty() && (
                  <IconButton
                    title="Release all pressed keys"
                    onClick={this.handleClearPressedKeysButtonClick}
                  >
                    <ClearPressedKeysIcon />
                  </IconButton>
                )
              }
              <IconButton
                title={`${
                  this.state.isShown ?
                    "Hide" :
                    "Show"
                } fake keyboard`}
                onClick={this.handleToggleButtonClick}
                className={this.props.classes.toggleButton}
              >
                🎹
              </IconButton>
            </div>
          }
        />
        {
          this.state.isShown && (
            <CardContent>
              <Keyboard
                onKeyPress={this.handleKeyPress}
                activeKeys={this.state.pressedKeys}
                getKeyClass={this.getKeyClass}
                lowestKeyNumber={this.props.minKeyNumber}
                highestKeyNumber={this.props.maxKeyNumber}
                showLabels={false}
              />
            </CardContent>
          )
        }
      </Card>
    );
  }
}

export default withStyles(styles)(FakeMIDIKeyboard);
