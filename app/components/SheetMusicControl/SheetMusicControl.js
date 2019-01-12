/* global require */

import React from "react";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

import SheetMusicPane from "@app/components/SheetMusicPane";

const req = require.context("../../musicxml", true, /\.(\w*)xml$/);
const filesByName = req.keys().reduce(
  (files, fileName) => {
    files[fileName] = req(fileName);

    return files;
  }, {}
);

/**
 * Component representing the home page.
 *
 * @extends external:React.PureComponent
 *
 * @memberof client.react-components
 */
class SheetMusicControl extends React.PureComponent {
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
        <Select
          value={this.state.selectedFile || ""}
          onChange={this.handleSelectFileChange}
        >
          {
            Object.keys(filesByName).map(
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
        {
          this.state.selectedFile !== null ?
            (
              <SheetMusicPane
                xml={filesByName[this.state.selectedFile]}
              />
            ) :
            null
        }
      </div>
    );
  }
}

export default SheetMusicControl;
