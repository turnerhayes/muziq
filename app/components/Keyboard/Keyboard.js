import React from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { Set } from "immutable";
import classnames from "classnames";
import { withStyles } from "@material-ui/core/styles";
import DocumentEvents from "react-document-events";

import { NoteNumberToName, NoteNameToNumber } from "@app/utils/midi/midi-note-converter";

const whiteKeyWidth = 3;

// eslint-disable-next-line no-magic-numbers
const whiteKeyHeight = whiteKeyWidth * 2;

// eslint-disable-next-line no-magic-numbers
const blackKeyWidth = whiteKeyWidth / 2;

// eslint-disable-next-line no-magic-numbers
const blackKeyHeight = whiteKeyHeight * 0.75;

const styles = {
  root: {
    overflowY: "auto",
  },
  
  keyboard: {
    listStyle: "none",
    paddingLeft: 0,
    display: "flex",
  },

  // Make room for the labels at top
  withLabels: {
    marginTop: "4em",
  },

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

    "&[data-hand='left']": {
      color: "blue",
    },

    "&[data-hand='right']": {
      color: "green",
    },
    
    "&:active": {

      "& $keyLabel": {
        opacity: 1,
        transition: "none",
      },
    },
  },

  activeKey: {
    transform: "rotateX(15deg)",
    transformOrigin: "center top",
    
    "& $keyLabel": {
      opacity: 1,
      transition: "none",
    },
  },
  
  blackKey: {
    width: `${blackKeyWidth}em`,
    minWidth: `${blackKeyWidth}em`,
    height: `${(blackKeyHeight).toFixed(2)}em`,
    backgroundColor: "black",
    marginLeft: `-${(blackKeyWidth / 2).toFixed(2)}em`,
    zIndex: 1,
    boxShadow: "0px 4px 9px 0px",

    "& $keyLabel": {
      marginTop: "-3em",
    },

    "& + $key": {
      marginLeft: `-${(blackKeyWidth / 2).toFixed(2)}em`,
    },
  },

  keyLabel: {
    display: "inline-block",
    opacity: 0,
    transition: "opacity 0s 0.5s linear",
    marginTop: "-1.6em",

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

const steps = "ABCDEFG";

class Keyboard extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    keyCount: PropTypes.number,
    leftHandKeys: ImmutablePropTypes.iterable.isRequired,
    rightHandKeys: ImmutablePropTypes.iterable.isRequired,
    showLabels: PropTypes.bool.isRequired,
    lowestKeyNumber: PropTypes.number,
    highestKeyNumber: PropTypes.number,
    className: PropTypes.string,
    onKeyPress: PropTypes.func,
    onKeyRelease: PropTypes.func,
  }
  
  static defaultProps = {
    keyCount: 88,
    leftHandKeys: Set(),
    rightHandKeys: Set(),
    showLabels: true,
  }

  state = {
    isKeyPressed: false,
  }

  lowestActiveNoteRef = React.createRef()

  rootRef = React.createRef()

  componentDidMount() {
    const lowestKey = this.getLowestKey(this.props.leftHandKeys, this.props.rightHandKeys);

    if (lowestKey) {
      this.scrollToLowestActiveNote();
    }
  }

  componentDidUpdate(prevProps) {
    const prevLowestKey = this.getLowestKey(prevProps.leftHandKeys, prevProps.rightHandKeys);
    const lowestKey = this.getLowestKey(this.props.leftHandKeys, this.props.rightHandKeys);
    
    if (lowestKey && prevLowestKey !== lowestKey) {
      this.scrollToLowestActiveNote();
    }
  }

  getLowestKey(leftHandKeys, rightHandKeys) {
    // @todo: sort leftHand/rightHandKeys props
    let lowestKey = leftHandKeys.first();

    if (!lowestKey) {
      lowestKey = rightHandKeys.first();
    }

    return lowestKey;
  }

  getKeyProps(el) {
    return {
      key: el.dataset.key,
      noteName: el.dataset.noteName,
      equivalentNotes: el.dataset.equivalentNotes,
    };
  }

  getKeyRange() {
    const { lowestKeyNumber, highestKeyNumber, keyCount } = this.props;

    if (lowestKeyNumber !== null && lowestKeyNumber !== undefined) {
      if (highestKeyNumber !== null && highestKeyNumber !== undefined) {
        return [
          lowestKeyNumber,
          highestKeyNumber,
        ];
      }

      return [
        lowestKeyNumber,
        lowestKeyNumber + keyCount,
      ];
    }

    if (highestKeyNumber !== null && highestKeyNumber !== undefined) {
      return [
        highestKeyNumber - keyCount,
        highestKeyNumber,
      ];
    }

    const middleC = NoteNameToNumber("C4");

    // eslint-disable-next-line no-magic-numbers
    const half = Math.floor(keyCount / 2);

    return [
      middleC - half,
      middleC + half - 1,
    ];
  }

  handleMouseDown = ({ target }) => {
    this.props.onKeyPress && this.props.onKeyPress(
      this.getKeyProps(target)
    );

    this.setState({
      isKeyPressed: true,
    });
  }

  handleMouseUp = ({ target }) => {
    this.props.onKeyRelease && this.props.onKeyRelease(
      this.getKeyProps(target)
    );

    this.setState({
      isKeyPressed: false,
    });
  }

  scrollToLowestActiveNote() {
    if (!this.lowestActiveNoteRef.current) {
      return;
    }

    this.rootRef.current.scrollLeft = this.lowestActiveNoteRef.current.offsetLeft;
  }

  render() {
    const keys = [];

    const keyRange = this.getKeyRange();
    
    for (let key = keyRange[0]; key <= keyRange[1]; key++) {
      
      /*
      A keyboard can be viewed as multiple blocks like this (W = white key, b = black key):
      
      W b W b W W b W b W b W
      
      This pattern repeats for as many keys as there are on the keyboard. So the black keys are
      in positions 1, 3, 6, 8 and 10 (0-based).
      */

      // eslint-disable-next-line no-magic-numbers
      const keyPosition = key % 12;

      let isBlack = false;

      /* eslint-disable no-magic-numbers */
      if (
        keyPosition === 1 ||
        keyPosition === 3 ||
        keyPosition === 6 ||
        keyPosition === 8 ||
        keyPosition === 10
      ) {
        isBlack = true;

        // Don't put a black key at the end
        if (key === keyRange[1]) {
          continue;
        }
      }
      /* eslint-enable no-magic-numbers */

      const note = NoteNumberToName(key);

      const accidental = note.alter > 0 ?
        "♯":
        note.alter < 0 ?
          "♭" :
          "";
      
      let equivalentNote;

      if (note.alter) {
        const stepIndex = steps.indexOf(note.step);

        if (note.alter > 0) {
          const nextStepIndex = stepIndex + 1;
          const nextStep = steps[nextStepIndex % steps.length];
          const nextStepOctave = nextStepIndex >= steps.length ?
            note.octave + 1 :
            note.octave;
          
          equivalentNote = `${nextStep}♭${nextStepOctave}`;
        }
        else {
          const prevStepIndex = stepIndex - 1;
          // Make sure to account for negative indices
          const prevStep = steps[(prevStepIndex + steps.length) % steps.length];
          const prevStepOctave = prevStepIndex >= steps.length ?
            note.octave + 1 :
            note.octave;
          
          equivalentNote = `${prevStep}♯${prevStepOctave}`;
        }
      }
      
      let noteName = `${note.step}${accidental}${note.octave}`;

      let isActive = this.props.leftHandKeys.includes(noteName) ||
        this.props.rightHandKeys.includes(noteName);

      let equivalentNotes;

      if (!isActive && equivalentNote) {
        equivalentNotes = [
          noteName.replace("♯", "#").replace("♭", "b"),
          equivalentNote,
          equivalentNote.replace("♯", "#").replace("♭", "b"),
        ];

        isActive = !Set(this.props.leftHandKeys).union(this.props.rightHandKeys)
          .intersect(Set(equivalentNotes))
          .isEmpty();
      }

      if (equivalentNote) {
        noteName = `${noteName}/${equivalentNote}`;
      }

      let hand;

      if (isActive) {
        if (this.props.leftHandKeys.includes(noteName)) {
          hand = "left";
        }
        else {
          hand = "right";
        }
      }

      keys.push(
        <li
          key={key}
          data-key-number={key}
          data-note-name={noteName}
          data-equivalent-notes={equivalentNotes}
          data-hand={hand}
          onMouseDown={this.handleMouseDown}
          className={classnames(
            this.props.classes.key,
            {
              [this.props.classes.blackKey]: isBlack,
              [this.props.classes.activeKey]: isActive,
            }
          )}
          ref={
            key === keyRange[0] ?
              this.lowestActiveNoteRef :
              undefined
          }
        >
          {
            this.props.showLabels && (
              <div
                className={this.props.classes.keyLabel}
                data-note-name={noteName}
              ></div>
            )
          }
        </li>
      );
    }
    
    return (
      <div
        className={classnames(
          this.props.classes.root,
          this.props.className,
        )}
        ref={this.rootRef}
      >
        <DocumentEvents
          enabled={this.state.isKeyPressed}
          onMouseUp={this.handleMouseUp}
        />
        <ul
          className={classnames(
            this.props.classes.keyboard,
            {
              [this.props.classes.withLabels]: this.props.showLabels,
            }
          )}
        >
          {keys}
        </ul>
      </div>
    );
  }
}

export default withStyles(styles)(Keyboard);
