import React from "react";
import { Set } from "immutable";

import Keyboard from "@app/components/Keyboard";
import FakeMIDIInput from "@app/utils/midi/FakeMIDIInput";

class FakeMIDIKeyboard extends React.PureComponent {
  state = {
    pressedKeys: Set(),
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

  render() {
    return (
      <div>
        <Keyboard
          onKeyPress={this.handleKeyPress}
          leftHandKeys={this.state.pressedKeys}
        />
      </div>
    );
  }
}

export default FakeMIDIKeyboard;
