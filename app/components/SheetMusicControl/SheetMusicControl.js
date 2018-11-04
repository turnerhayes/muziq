import React from "react";

import SheetMusicPane from "@app/components/SheetMusicPane";
import xml from "@app/musicxml/Chrono Trigger - Wind Scene.xml";

const filesByName = {
  "Chrono Trigger - Wind Scene": xml,
};

const files = [
  "Chrono Trigger - Wind Scene",
];

/**
 * Component representing the home page.
 *
 * @extends external:React.PureComponent
 *
 * @memberof client.react-components
 */
class SheelMusicControl extends React.PureComponent {
  state = {
    selectedFile: null,
  }

  handleSelectFileChange = ({ target }) => {
    this.setState({
      selectedFile: target.value,
    });
  }

  /**
	 * Renders the component.
	 *
	 * @function
	 *
	 * @return {external:React.Component} the component to render
	 */
  render() {
    return (
      <div
      >
        <select
          onChange={this.handleSelectFileChange}
        >
          <option>-- Select one --</option>
          {
            files.map(
              (name) => (
                <option
                  key={name}
                  value={name}
                >{name}</option>
              )
            )
          }
        </select>
        {
          this.state.selectedFile !== null && (
            <SheetMusicPane
              xml={filesByName[this.state.selectedFile]}
            />
          )
        }
      </div>
    );
  }
}

export default SheelMusicControl;
