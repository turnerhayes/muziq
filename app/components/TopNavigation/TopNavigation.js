import React                from "react";
import PropTypes            from "prop-types";
import ImmutablePropTyps    from "react-immutable-proptypes";
import { Link }             from "react-router-dom";
import {
  injectIntl,
  intlShape
}                           from "react-intl";
import AppBar               from "@material-ui/core/AppBar";
import Toolbar              from "@material-ui/core/Toolbar";
import Popover              from "@material-ui/core/Popover";
import Button               from "@material-ui/core/Button";
import IconButton           from "@material-ui/core/IconButton";
import { withStyles }       from "@material-ui/core/styles";
import HomeIcon             from "@material-ui/icons/Home";
import AccountCircleIcon    from "@material-ui/icons/AccountCircle";

import AccountDialog        from "@app/containers/AccountDialog";
import messages             from "./messages";

const styles = {
  accountButton: {
    marginLeft: "auto",
  },
};

/**
 * Component representing the navigation bar on the top of the page.
 *
 * @class
 * @extends external:React.PureComponent
 *
 * @memberof client.react-components
 */
class TopNavigation extends React.PureComponent {
  /**
   * @member {object} - Component prop types
   *
   * @prop {!external:Immutable.Map} [loggedInUser] - the logged in user, if any
   * @prop {string} [className] - any extra class names to add to the root element
   * @prop {object} intl - an Intl object from the react-intl package
   */
  static propTypes = {
    loggedInUser: ImmutablePropTyps.map,
    className: PropTypes.string,
    intl: intlShape.isRequired,
    classes: PropTypes.object.isRequired,
  }

  state = {
    accountButtonEl: null,
    quickSettingsButtonEl: null,
  }

  formatMessage = (...args) => {
    return this.props.intl.formatMessage(...args);
  }

  /**
   * Handles a click of the Account button.
   *
   * @function
   * @private
   *
   * @param {React.Event} event - the event for the click
   *
   * @returns {void}
   */
  onAccountButtonClick = (event) => {
    this.setState({
      accountButtonEl: event.target,
    });
  }

  closeAccountDialog = () => {
    this.setState({
      accountButtonEl: null,
    });
  }

  /**
   * Handles a click of the Quick Settings button.
   *
   * @function
   * @private
   *
   * @param {React.Event} event - the event for the click
   *
   * @returns {void}
   */
  onQuickSettingsButtonClick = (event) => {
    this.setState({
      quickSettingsButtonEl: event.target,
    });
  }

  closeQuickSettingsDialog = () => {
    this.setState({
      quickSettingsButtonEl: null,
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
      <AppBar
        className={this.props.className}
        position="static"
      >
        <Toolbar>
          <Link
            to="/"
            title={this.formatMessage(messages.links.home)}
          >
            <HomeIcon/>
          </Link>
          
          <Button
            component={Link}
            to="/kb"
          >
            KB Tutorial
          </Button>
          
          <Button
            component={Link}
            to="/sheetmusic"
          >
            {this.formatMessage(messages.links.sheetmusic)}
          </Button>

          <Button
            component={Link}
            to="/generator"
          >
            {this.formatMessage(messages.links.generator)}
          </Button>

          <Button
            component={Link}
            to="/recorder"
          >
            {this.formatMessage(messages.links.recorder)}
          </Button>

          <Button
            component={Link}
            to="/keyboard"
          >
            Keyboard Tutorial
          </Button>

          <IconButton
            className={this.props.classes.accountButton}
            onClick={this.onAccountButtonClick}
          >
            <AccountCircleIcon />
          </IconButton>
          <Popover
            open={!!this.state.accountButtonEl}
            onClose={this.closeAccountDialog}
            anchorEl={this.state.accountButtonEl}
            anchorOrigin={{
              horizontal: "right",
              vertical: "bottom",
            }}
            transformOrigin={{
              horizontal: "right",
              vertical: "top",
            }}
          >
            <AccountDialog
              loggedInUser={this.props.loggedInUser}
            />
          </Popover>
        </Toolbar>
      </AppBar>
    );
  }
}

export { TopNavigation as Unwrapped };

export default injectIntl(withStyles(styles)(TopNavigation));
