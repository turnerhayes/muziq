import React from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { Set } from "immutable";
import classnames from "classnames";
import { withStyles } from "@material-ui/core/styles";
import RootRef from "@material-ui/core/RootRef";
import DocumentEvents from "react-document-events";

import { NoteNumberToName, NoteNameToNumber } from "@app/utils/midi/midi-note-converter";
import Key from "./Key";


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
};

const steps = "ABCDEFG";

class Keyboard extends React.PureComponent {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    keyCount: PropTypes.number,
    activeKeys: ImmutablePropTypes.iterable.isRequired,
    scrollToLowestKeyOnChange: PropTypes.bool.isRequired,
    showLabels: PropTypes.bool.isRequired,
    lowestKeyNumber: PropTypes.number,
    highestKeyNumber: PropTypes.number,
    className: PropTypes.string,
    onKeyPress: PropTypes.func,
    onKeyRelease: PropTypes.func,
    getKeyClass: PropTypes.func,
    getShouldShowLabel: PropTypes.func,
    keyComponent: PropTypes.func.isRequired,
  }
  
  static defaultProps = {
    keyCount: 88,
    activeKeys: Set(),
    showLabels: true,
    scrollToLowestKeyOnChange: false,
    keyComponent: Key,
  }

  state = {
    isKeyPressed: false,
  }

  lowestActiveNoteRef = React.createRef()

  rootRef = React.createRef()

  componentDidMount() {
    if (this.props.scrollToLowestKeyOnChange) {
      const lowestKey = this.getLowestActiveKey(this.props.activeKeys);
  
      if (lowestKey) {
        this.scrollToLowestActiveNote();
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.scrollToLowestKeyOnChange) {
      const prevLowestKey = this.getLowestActiveKey(prevProps.activeKeys);
      const lowestKey = this.getLowestActiveKey(this.props.activeKeys);
      
      if (lowestKey && prevLowestKey !== lowestKey) {
        this.scrollToLowestActiveNote();
      }
    }
  }

  getLowestActiveKey(
    activeKeys = this.props.activeKeys,
  ) {
    // @todo: sort activeKeys prop
    let lowestKey = activeKeys.first();

    return lowestKey;
  }

  getKeyProps(el) {
    return {
      key: Number(el.dataset.keyNumber),
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

  handleMouseDown = ({ currentTarget }) => {
    this.props.onKeyPress && this.props.onKeyPress(
      this.getKeyProps(currentTarget)
    );

    this.setState({
      isKeyPressed: true,
    });
  }

  handleMouseUp = ({ currentTarget }) => {
    this.props.onKeyRelease && this.props.onKeyRelease(
      this.getKeyProps(currentTarget)
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

      let isActive = this.props.activeKeys.includes(noteName);

      let equivalentNotes;

      if (!isActive && equivalentNote) {
        equivalentNotes = [
          noteName.replace("♯", "#").replace("♭", "b"),
          equivalentNote,
          equivalentNote.replace("♯", "#").replace("♭", "b"),
        ];

        isActive = !this.props.activeKeys
          .intersect(Set(equivalentNotes))
          .isEmpty();
      }

      const Key = this.props.keyComponent;
      
      const keyProps = {
        keyNumber: key,
        noteName,
        isBlack,
        isActive,
        equivalentNotes,
        onMouseDown: this.handleMouseDown,
        showLabel: false,
      };

      let keyComp;

      if (noteName === this.getLowestActiveKey()) {
        keyComp = (
          <RootRef
            key={key}
            rootRef={this.lowestActiveNoteRef}
          >
            <Key
              {...keyProps}
            />
          </RootRef>
        );
      }
      else {
        keyComp = (
          <Key
            key={key}
            {...keyProps}
          />
        );
      }

      keys.push(keyComp);
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
