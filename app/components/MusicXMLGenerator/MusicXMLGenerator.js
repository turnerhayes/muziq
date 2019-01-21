import React from "react";
import CodeMirror from "react-codemirror";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
// import * as OSMD from "opensheetmusicdisplay";
import { MusicSheet } from "opensheetmusicdisplay/lib/src/MusicalScore/MusicSheet";
// import { GraphicalMusicSheet } from "opensheetmusicdisplay/lib/src/MusicalScore/Graphical/GraphicalMusicSheet";
import {
  VexFlowMusicSheetCalculator
} from "opensheetmusicdisplay/lib/src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { SourceMeasure } from "opensheetmusicdisplay/lib/src/MusicalScore/VoiceData/SourceMeasure";

import "codemirror/lib/codemirror.css";
import { Instrument } from "opensheetmusicdisplay/lib/src/MusicalScore/Instrument";

// const ms = new MusicSheet();

// console.log(ms);

const sheet = new MusicSheet();

sheet.addMeasure(
  // eslint-disable-next-line no-magic-numbers
  new SourceMeasure(2)
);

sheet.Instruments.push(
  new Instrument(1, "Piano")
);

sheet.fillStaffList();

const calculator = new VexFlowMusicSheetCalculator();

// const gms = new GraphicalMusicSheet(sheet, calculator);

calculator.initialize();

class MusicXMLGenerator extends React.PureComponent {
  state = {
    osmd: null,
    xml: null,
  }

  osmdRendered = false

  setOSMDObject({ oldValue } = {}) {
    if (this.state.xml && oldValue !== this.state.xml && this.containerRef.current) {
      this.osmdRendered = false;
      const parser = new DOMParser();
      const doc = parser.parseFromString(this.state.xml, "application/xml");

      if (doc.getRootNode().nodeName.toLowerCase() === "parsererror") {
        return;
      }

      const osmd = new OpenSheetMusicDisplay(
        this.containerRef.current,
        {
          autoResize: false,
        }
      );
    
      osmd.load(doc)
        .then(
          () => this.setState({
            osmd,
          })
        ).catch(
          // eslint-disable-next-line no-console
          (err) => console.log(err)
        );
    }
  }

  componentDidMount() {
    this.setOSMDObject();
  }
  
  componentDidUpdate(prevProps, prevState) {
    this.setOSMDObject({
      oldValue: prevState.xml,
    });
  }

  containerRef = React.createRef()

  onCodeChange = (xml) => {
    this.setState({
      xml,
    });
  }

  render() {
    if (this.state.osmd && !this.isRendered) {
      this.state.osmd.render();
      this.isRendered = true;
    }

    return (
      <div>
        <div
          ref={this.containerRef}
        >
        </div>
        <CodeMirror
          value={this.state.xml}
          onChange={this.onCodeChange}
        />
      </div>
    );
  }
}

export default MusicXMLGenerator;
