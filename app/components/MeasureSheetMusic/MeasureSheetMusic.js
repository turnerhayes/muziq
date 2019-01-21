import React from "react";
import PropTypes from "prop-types";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import timePartXSLTString from "@app/timepart.xsl";

const parser = new DOMParser();

const timePartXSLT = parser.parseFromString(timePartXSLTString, "application/xml");

/**
 * Returns a a MusicXML document that contains only the specified measure number.
 * 
 * Does not modify the passed document.
 * 
 * @param {Document} doc - the XML document containing the sheet music
 * @param {number} measureNumber - the number of the measure to extract (1-based)
 * 
 * @returns {Document} the XML document with only the specified measure
 */
const getMeasure = (doc, measureNumber) => {
  doc = doc.cloneNode(true);

  let attributesNode;

  Array.from(doc.querySelectorAll("measure")).forEach(
    (measureNode) => {
      const currentMeasureNumber = Number(measureNode.getAttribute("number"));

      if (currentMeasureNumber === measureNumber) {
        if (attributesNode && !measureNode.querySelector("attributes")) {
          measureNode.insertBefore(attributesNode, measureNode.children[0]);
        }

        return;
      }

      if (currentMeasureNumber < measureNumber) {
        const currentAttributesNode = measureNode.querySelector("attributes");

        if (currentAttributesNode) {
          attributesNode = currentAttributesNode;
        }
      }

      measureNode.parentNode.removeChild(measureNode);
    }
  );

  return doc;
};

class MeasureSheetMusic extends React.PureComponent {
  static propTypes = {
    sheetXMLDocument: PropTypes.instanceOf(Document).isRequired,
    measureNumber: PropTypes.number.isRequired
  }

  state = {
    sheetDisplay: null,
  }

  setSheetDisplay() {
    if (!this.state.osmd && this.containerRef.current) {
      const sheetDisplay = new OpenSheetMusicDisplay(
        this.containerRef.current,
        {
          autoResize: false,
        }
      );

      let xml = this.props.sheetXMLDocument;

      if (xml.querySelector("score-timewise")) {
        const xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(timePartXSLT);
        xml = xsltProcessor.transformToDocument(xml);
      }

      xml = getMeasure(xml, this.props.measureNumber);
    
      sheetDisplay.load(xml)
        .then(
          () => this.setState({
            sheetDisplay,
          })
        ).catch(
          // eslint-disable-next-line no-console
          (err) => console.error(err)
        );
    }
  }

  containerRef = React.createRef()

  componentDidMount() {
    this.setSheetDisplay();
  }
  
  componentDidUpdate() {
    this.setSheetDisplay();
  }

  render() {
    return (
      <div
        ref={this.containerRef}
      ></div>
    );
  }
}


export default MeasureSheetMusic;
