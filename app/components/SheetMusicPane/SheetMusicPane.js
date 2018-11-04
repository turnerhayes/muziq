import React from "react";
import PropTypes from "prop-types";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";


class SheetMusicPane extends React.PureComponent {
  static propTypes = {
    xml: PropTypes.string.isRequired,
  }

  state = {
    osmd: null,
  }

  setOSMDObject() {
    if (!this.state.osmd && this.containerRef.current) {
      const osmd = new OpenSheetMusicDisplay(
        this.containerRef.current,
        {
          autoResize: false,
        }
      );
    
      osmd.load(this.props.xml)
        .then(
          () => this.setState({
            osmd,
          })
        ).catch(
          (err) => console.log(err)
        );
    }
  }

  componentDidMount() {
    this.setOSMDObject();
  }
  
  componentDidUpdate() {
    this.setOSMDObject();
  }

  containerRef = React.createRef()

  render() {
    this.state.osmd && (
      this.state.osmd.render()
    );

    return (
      <div>
        <div
          ref={this.containerRef}
        >
        </div>
      </div>
    );
  }
}

export default SheetMusicPane;
