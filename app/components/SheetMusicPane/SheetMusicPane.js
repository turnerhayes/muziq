import React from "react";
import PropTypes from "prop-types";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";


class SheetMusicPane extends React.Component {
  static propTypes = {
    xml: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Document),
    ]).isRequired,
  }

  state = {
    osmd: null,
    isLoaded: false,
    isLoading: false,
  }

  setOSMDObject(callback) {
    if (this.state.osmd) {
      return callback();
    }

    this.setState(
      (prevState) => {
        const state = {};

        let osmd = prevState.osmd;

        if (!osmd && this.containerRef.current) {
          osmd = new OpenSheetMusicDisplay(
            this.containerRef.current,
            {
              autoResize: false,
            }
          );

          state.osmd = osmd;
        }

        return state;
      },
      callback
    );
  }

  loadXML() {
    this.setOSMDObject(() => {
      this.setState(
        {
          isLoading: true,
        },
        () => {
          this.state.osmd.load(this.props.xml).then(
            () => this.setState({
              isLoaded: true,
              isLoading: false,
            })
          ).catch(
            (err) => {
              // eslint-disable-next-line no-console
              console.log(err);
              this.setState({
                isLoading: false,
              });
            }
          );
        }
      );
    });
  }

  componentDidMount() {
    this.loadXML();
  }
  
  componentDidUpdate(prevProps) {
    if (this.props.xml !== prevProps.xml) {
      this.setState(
        {
          isLoaded: false,
          isLoading: false,
        },
        () => {
          this.loadXML();
        }
      );
    }
  }

  containerRef = React.createRef()

  render() {
    if (this.state.isLoading) {
      return (
        <div>
          Loading...
        </div>
      );
    }

    this.state.isLoaded && (
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
