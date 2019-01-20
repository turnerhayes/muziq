import React from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { Set } from "immutable";
import classnames from "classnames";
import { withStyles } from "@material-ui/core/styles";

import { Key } from "@app/components/Keyboard";
import PlayableItem from "@app/utils/midi/CleffLines/PlayableItem";
import { MIDDLE_C_KEY_NUMBER } from "@app/utils/midi/constants";


const styles = {
  middleC: {
    "&::after": {
      content: '"MIDDLE C"',
      display: "inline-block",
      transform: "rotateZ(-90deg)",
      whiteSpace: "nowrap",
      height: "1em",
      position: "relative",
      top: "40%",
      left: "-10%",
    },
  },

  targetWhiteKey: {
    backgroundColor: "yellow",
  },

  correctWhiteKey: {
    backgroundColor: "green",
  },

  incorrectWhiteKey: {
    backgroundColor: "red",
  },
};

const getKeyComponent = (hand, displayName) => {
  class _Key extends React.PureComponent {
    static propTypes = {
      ...Key.propTypes,
      keyClasses: PropTypes.object.isRequired,
      classes: PropTypes.object.isRequired,
      pressedKeys: ImmutablePropTypes.setOf(
        PropTypes.string
      ).isRequired,
      currentLeftNote: PropTypes.instanceOf(PlayableItem),
      currentRightNote: PropTypes.instanceOf(PlayableItem),
    }

    static defaultProps = {
      ...Key.defaultProps,
    }

    /**
     * Gets the class name(s) for the key represented by the argument
     * 
     * @param {object} noteArgs - the properties describing the note
     * @param {string} noteArgs.noteName - the name (step + octave) of the note (e.g. "A2")
     * @param {number} noteArgs.key - the MIDI key number
     * @param {boolean} noteArgs.isBlack - whether the note is represented by a black key
     * 
     * @returns {string|undefined} the class name(s) to add, if any
     */
    getKeyClass = () => {
      const {
        keyNumber,
        noteName,
        pressedKeys,
        equivalentNotes,
        classes,
        currentLeftNote,
        currentRightNote,
      } = this.props;

      const keyClasses = [];

      if (keyNumber === MIDDLE_C_KEY_NUMBER) {
        keyClasses.push(classes.middleC);
      }

      const isPressed = !Set(equivalentNotes).add(noteName)
        .intersect(pressedKeys).isEmpty();

      const isLeftKey = !!(
        currentLeftNote &&
        currentLeftNote.notes &&
        currentLeftNote.notes.find(
          (note) => note.name === noteName
        )
      );

      const isRightKey = !!(
        currentRightNote &&
        currentRightNote.notes &&
        currentRightNote.notes.find(
          (note) => note.name === noteName
        )
      );
      
      if (
        (
          hand === "left" &&
          isLeftKey
        ) || (
          hand === "right" &&
          isRightKey
        )
      ) {
        if (isPressed) {
          // if (!isBlack) {
          keyClasses.push(classes.correctWhiteKey);
          // }
        }
        else {
          // if (!isBlack) {
          keyClasses.push(classes.targetWhiteKey);
          // }
        }
      }
      else {
        if (isPressed) {
          // Not correct for this hand--but maybe correct for the other hand? If so, ignore it
          if (
            !(
              (
                hand === "left" &&
                isRightKey
              ) || (
                hand === "right" &&
                isLeftKey
              )
            )
          ) {
            keyClasses.push(classes.incorrectWhiteKey);
          }
        }
      }

      return classnames(keyClasses);
    }

    render() {
      const {
        keyClasses,
        className,
        ...props,
      } = this.props;

      return (
        <Key
          {...props}
          classes={keyClasses}
          className={
            classnames(
              className,
              this.getKeyClass()
            )
          }
        />
      );
    }
  }

  const Styled_Key = withStyles(styles)(_Key);


  const keyClass = class extends React.PureComponent {
    static propTypes = {
      classes: PropTypes.object.isRequired,
    }

    static defaultProps = {
      classes: {},
    }

    render() {
      const {
        classes,
        ...props,
      } = this.props;

      // The following is a tricky workaround for `withStyles()` behavior. 
      // When you wrap a component via `withStyles()`, not only does it add a
      // `classes` prop but it also adds a validator that shows a warning if
      // passed a `classes` object that contains keys not defined in the `styles`
      // passed to `withStyles()`. So if a component renders a `<TutorialKey>`
      // component and passes any keys in the `classes` prop that are designed to
      // be used by `<Key>`, it will show errors because those keys are not
      // defined by the `<TutorialKey>` component. So the workaround is to create
      // an intermediary component (Styled_Key) that is wrapped with `withStyles()`
      // and divide out the classes keys intended for the `<Key>` component from
      // those intended for this (or more accurately the Styled_Key) component.

      const _keyClasses = {};
      
      const keyClasses = {};
      for (let key in classes) {
        if (!classes.hasOwnProperty(key)) {
          continue;
        }
        
        if (key in styles) {
          _keyClasses[key] = classes[key];
        }
        else {
          keyClasses[key] = classes[key];
        }
      }
      
      return (
        <Styled_Key
          {...props}
          keyClasses={keyClasses}
          classes={_keyClasses}
        />
      );
    }
  };

  keyClass.displayName = displayName;

  return keyClass;
};

export const LeftTutorialKey = getKeyComponent("left", "LeftTutorialKey");

export const RightTutorialKey = getKeyComponent("right", "RightTutorialKey");
