import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import classnames from "classnames";

const whiteKeyWidth = 3;

// eslint-disable-next-line no-magic-numbers
const whiteKeyHeight = whiteKeyWidth * 2;

// eslint-disable-next-line no-magic-numbers
const blackKeyWidth = whiteKeyWidth / 2;

// eslint-disable-next-line no-magic-numbers
const blackKeyHeight = whiteKeyHeight * 0.75;

const styles = {
  key: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    border: "1px solid black",
    width: `${whiteKeyWidth}em`,
    minWidth: `${whiteKeyWidth}em`,
    height: `${whiteKeyHeight}em`,
    cursor: "pointer",
    boxShadow: "0px 4px 2px 0px",
    borderRadius: "0 0 3px 3px",
    backgroundColor: "white",
    position: "relative",
  },

  activeKey: {
    transform: "rotateX(15deg)",
    transformOrigin: "center top",
  },

  blackKey: {
    width: `${blackKeyWidth}em`,
    minWidth: `${blackKeyWidth}em`,
    // eslint-disable-next-line no-magic-numbers
    height: `${(blackKeyHeight).toFixed(2)}em`,
    backgroundColor: "black",
    // eslint-disable-next-line no-magic-numbers
    marginLeft: `-${(blackKeyWidth / 2).toFixed(2)}em`,
    zIndex: 1,
    boxShadow: "0px 4px 9px 0px",
    
    "& $keyLabel": {
      marginTop: "-3em",
    },
    
    "& + $key": {
      // eslint-disable-next-line no-magic-numbers
      marginLeft: `-${(blackKeyWidth / 2).toFixed(2)}em`,
    },
  },

  keyLabel: {
    display: "inline-block",
    marginTop: "-1.6em",
    position: "absolute",

    "&::after": {
      content: "attr(data-note-name)",
      display: "inline-block",
      transform: "rotateZ(-56deg)",
      transformOrigin: "bottom center",
      marginLeft: "50%",
      whiteSpace: "nowrap",
    },
  },
};

const classesShape = {};

for (let classKey in styles) {
  if (!styles.hasOwnProperty(classKey)) {
    continue;
  }

  classesShape[classKey] = PropTypes.string;
}

class Key extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.shape(classesShape).isRequired,
    keyNumber: PropTypes.number.isRequired,
    noteName: PropTypes.string.isRequired,
    equivalentNotes: PropTypes.arrayOf(
      PropTypes.string,
    ),
    className: PropTypes.string,
    onMouseDown: PropTypes.func,
    showLabel: PropTypes.bool.isRequired,
    isBlack: PropTypes.bool.isRequired,
    isActive: PropTypes.bool.isRequired,
    ref: PropTypes.shape({
      current: PropTypes.instanceOf(Element),
    }),
  }

  static defaultProps = {
    showLabel: false,
  }

  render() {
    const {
      classes,
      keyNumber,
      noteName,
      equivalentNotes,
      className,
      onMouseDown,
      showLabel,
      isBlack,
      isActive,
      ref,
    } = this.props;

    const rootClass = classnames(
      className,
      classes.key, {
        [classes.blackKey]: isBlack,
        [classes.activeKey]: isActive,
      },
    );

    let displayNoteName = noteName;

    if (equivalentNotes && equivalentNotes.length > 0) {
      displayNoteName = `${noteName}(${equivalentNotes.join(", ")})`;
    }

    return (
      <li
        data-key-number={keyNumber}
        data-note-name={noteName}
        data-equivalent-notes={equivalentNotes}
        onMouseDown={onMouseDown}
        className={rootClass}
        ref={ref}
      >
        {
          showLabel && (
            <div
              className={classes.keyLabel}
              data-note-name={displayNoteName}
            ></div>
          )
        }
      </li>
    );
  }
}

export default withStyles(styles)(Key);
