import React                        from "react";
import PropTypes                    from "prop-types";
import { Switch, Route }            from "react-router-dom";

import { withStyles }               from "@material-ui/core/styles";
import { Loadable as NotFoundPage } from "@app/components/NotFoundPage";
import { Loadable as HomePage }     from "@app/components/HomePage";
import SheetMusicControl            from "@app/components/SheetMusicControl";
// import MusicXMLGenerator            from "@app/components/MusicXMLGenerator";
import MIDIRecorder                 from "@app/components/MIDIRecorder";
import KeyboardTutorial             from "@app/components/KeyboardTutorial";
import TopNavigation                from "@app/containers/TopNavigation";

const styles = {
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  
  mainHeader: {
    width: "100%",
  },
  
  mainContentContainer: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
    overflow: "auto",
  },
  
  mainContent: {
    flex: 1,
    order: 1,
    height: "100%",
    maxWidth: "100%",
  },
  
  leftPanel: {
    width: "33%",
    order: 0,
    borderRight: "1px solid black",
  },
};

/**
 * Root application component.
 *
 * @memberof client.react-components
 * @extends external:React.Component
 */
class App extends React.Component { // Do not use PureComponent; messes with react-router
  static propTypes = {
    classes: PropTypes.object.isRequired,
  }

  /**
   * Generates a React component representing the application.
   *
   * @function
   *
   * @return {external:React.Component} the component to render
   */
  render() {
    return (
      <section
        className={this.props.classes.mainContainer}
      >
        <header
          className={this.props.classes.mainHeader}
        >
          <TopNavigation
          />
        </header>
        <div
          className={this.props.classes.mainContentContainer}
        >
          <article
            className={this.props.classes.mainContent}
          >
            <Switch>
              <Route exact path="/" component={HomePage} />
              <Route exact path="/sheetmusic" component={SheetMusicControl} />
              {/* <Route exact path="/generator" component={MusicXMLGenerator} /> */}
              <Route exact path="/recorder" component={MIDIRecorder} />
              <Route exact path="/keyboard" component={KeyboardTutorial} />
              <Route component={NotFoundPage} />
            </Switch>
          </article>
        </div>
      </section>
    );
  }
}

export default withStyles(styles)(App);
