import NoteItem from "./NoteItem";
import RestItem from "./RestItem";
import { NoteNameToNumber } from "../midi-note-converter";
import RepeatItem from "./RepeatItem";
import isPiano from "../is-piano";

const getChordNoteNodes = ({ xmlDocument, startNote }) => {
  const staffNode = startNote.querySelector("staff");

  const staffNumber = staffNode ?
    Number(staffNode.textContent) :
    1;

  const siblingsIterator = xmlDocument.evaluate(
    `following-sibling::note[staff/text() = "${staffNumber}"]`,
    startNote,
    null,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE
  );

  const siblings = [];

  let nextNoteNode = siblingsIterator.iterateNext();
  while (nextNoteNode && nextNoteNode.querySelector("chord")) {
    siblings.push(nextNoteNode);
    
    nextNoteNode = siblingsIterator.iterateNext();
  }

  return siblings;
};

const noteNodeToName = (node) => {
  const step = node.querySelector("pitch step");
  const octave = node.querySelector("pitch octave");
  return `${step.textContent}${octave.textContent}`;
};

/**
 * Represents a measure of the music.
 * 
 * @property {number} number - the measure number (1-based)
 * @property {number} divisionOffset - the number of divisions before this measure starts
 * @property {PlayableItem[]} rightHandItems - the note and rest items for the right hand clef
 * @property {PlayableItem[]} leftHandItems - the note and rest items for the left hand clef
 * @property {RepeatItem} [repeat] - the repeat item describing this measure's repeat behavior
 *  (if applicable)
 */
class Measure {
  constructor({ number, divisionOffset, rightHandItems, leftHandItems, repeat }) {
    const items = {
      rightHand: rightHandItems,
      leftHand: leftHandItems,
    };
    
    Object.defineProperties(
      this,
      {
        number: {
          enumerable: true,
          configurable: true,
          value: number,
        },

        divisionOffset: {
          enumerable: true,
          configurable: true,
          value: divisionOffset,
        },

        repeat: {
          enumerable: true,
          configurable: true,
          value: repeat,
        },

        items: {
          enumerable: true,
          configurable: true,
          value: items,
        },
      },
    );

    return number;
  }
}

/**
 * Describes up to two cleff lines for the piano (left hand and right hand)
 * 
 * @property {string} partID - the ID of the part that defines the piano part
 * @property {Measure[]} measures - the measures in the music
 * @property {Object<number, PlayableItem>} divisionOffsets - a mapping of division count
 *  before a playable item (note or rest) to the item
 */
export default class CleffLines {
  constructor({ partID, measures, divisionOffsets }) {
    Object.defineProperties(
      this,
      {
        measures: {
          enumerable: true,
          configurable: true,
          value: measures,
        },

        partID: {
          enumerable: true,
          configurable: true,
          value: partID,
        },

        divisionOffsets: {
          enumerable: true,
          configurable: true,
          value: divisionOffsets,
        },
      }
    );
  }

  /**
   * Creates a CleffLines instance by parsing an XML document derived from MusicXML
   * 
   * @param {Document} xmlDocument - the XML document object representing the MusicXML
   * 
   * @returns {CleffLines} the parsed CleffLines instance
   */
  static fromDocument({ xmlDocument }) {
    let cumulativeDivisionsAtMeasureStart = 0;

    const measures = [];

    const divisionOffsets = {};
    
    const previousNoteItems = {
      left: null,
      right: null,
    };

    let partID;

    const pianoNameIDs = [];

    Array.from(xmlDocument.querySelectorAll("score-part")).forEach(
      (partNode) => {
        const currentPartID = partNode.getAttribute("id");
        const midiNumberNode = partNode.querySelector("midi-instrument midi-program");

        if (midiNumberNode) {
          const midiNumber = Number(midiNumberNode.textContent);

          if (isPiano(midiNumber)) {
            partID = currentPartID;
            // Exit loop
            return false;
          }
        }
        else if (/piano/i.test(partNode.querySelector("part-name"))) {
          pianoNameIDs.push(partID);
        }
      }
    );

    if (!partID) {
      partID = pianoNameIDs[0];
    }

    const repeats = [];

    Array.from(xmlDocument.querySelectorAll("measure")).forEach(
      (measureNode) => {
        const measureNumber = Number(measureNode.getAttribute("number"));

        const divisionsByStaff = {};

        const noteIterator = xmlDocument.evaluate(
          `part[@id="${partID}"]/note[not(chord)]`,
          measureNode,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE
        );

        let note = noteIterator.iterateNext();
        
        const staffItems = {
          left: [],
          right: [],
        };

        while (note) {
          const staffNode = note.querySelector("staff");
          
          const staffNumber = staffNode ?
            Number(staffNode.textContent) :
            1;
          
          // @todo more robust detection of right hand and left hand staves
          const hand = staffNumber === 1 ? "right" : "left";
  
          const divisions = Number(note.querySelector("duration").textContent);
          
          if (!(staffNumber in divisionsByStaff)) {
            divisionsByStaff[staffNumber] = cumulativeDivisionsAtMeasureStart;
          }

          let noteItem;
          
          if (note.querySelector("rest")) {
            noteItem = new RestItem({
              divisionOffset: divisionsByStaff[staffNumber],
              divisions,
              hand,
            });
          }
          else {
            const chordNoteNodes = getChordNoteNodes({ xmlDocument, startNote: note });
  
            const notes = [
              note,
              ...chordNoteNodes,
            ].map(
              (noteNode) => {
                const name = noteNodeToName(noteNode);

                return {
                  node: noteNode,
                  number: NoteNameToNumber(name),
                  name,
                };
              }
            );

            noteItem = new NoteItem({
              divisionOffset: divisionsByStaff[staffNumber],
              divisions,
              hand,
              notes,
            });
          }

          if (previousNoteItems[hand]) {
            noteItem.previousItem = previousNoteItems[hand];
            previousNoteItems[hand].nextItem = noteItem;
          }

          divisionOffsets[divisionsByStaff[staffNumber]] = noteItem;

          staffItems[hand].push(noteItem);

          divisionsByStaff[staffNumber] += divisions;

          previousNoteItems[hand] = noteItem;
          note = noteIterator.iterateNext();
        }

        const repeatNode = measureNode.querySelector("repeat");

        let repeat;

        if (repeatNode) {
          const direction = repeatNode.getAttribute("direction");

          let targetMeasure;
          if (direction === "backward") {
            // no repeats so far; go back to beginning
            if (repeats.length === 0) {
              targetMeasure = measures[1];

            }
            else {
              for (let repeatIndex = repeats.length - 1; repeatIndex >= 0; repeatIndex--) {
                if (repeats[repeatIndex].direction === "forward") {
                  targetMeasure = measures[repeats[repeatIndex].measureNumber];
                }
              }
            }
          }

          repeat = new RepeatItem({
            measureNumber,
            direction,
            targetMeasure,
          });

          repeats.push(repeat);
        }

        const measure = new Measure({
          number: measureNumber,
          divisionOffset: cumulativeDivisionsAtMeasureStart,
          leftHandItems: staffItems.left,
          rightHandItems: staffItems.right,
          repeat,
        });

        staffItems.left.forEach(
          (item) => item.measure = measure
        );

        staffItems.right.forEach(
          (item) => item.measure = measure
        );

        // By the end of the measure, both staves should have the same number of divisions before it,
        // so we just need to choose one (doesn't matter which)
        cumulativeDivisionsAtMeasureStart = divisionsByStaff[Object.keys(divisionsByStaff)[0]];

        measures[measureNumber] = measure;
      }
    );

    return new CleffLines({
      partID,
      measures,
      divisionOffsets,
    });
  }

  /**
   * Gets the next playable items after the current items
   * 
   * @param {PlayableItem} currentLeftNote - the playable item for the left hand to start from
   * @param {PlayableItem} currentRightNote - the playable item for the right hand to start from
   * @param {number} [repeatCount] - the number of repeats completed (used to determine whether
   *  or not to honor any repeats found)
   * 
   * @returns {{leftHand: PlayableItem, rightHand: PlayableItem}} the following playable items
   */
  nextNotes({ currentLeftNote, currentRightNote, repeatCount = 0 } = {}) {
    const nextLeftNote = currentLeftNote ?
      currentLeftNote.nextItem :
      this.measures[1].items.leftHand[0];
    const nextRightNote = currentRightNote ?
      currentRightNote.nextItem :
      this.measures[1].items.rightHand[0];

    if (!nextLeftNote && !nextRightNote) {
      return null;
    }

    let next;

    if (nextLeftNote && nextRightNote && nextLeftNote.divisionOffset < nextRightNote.divisionOffset) {
      next = {
        leftHand: nextLeftNote,
      };
    }
    else if (nextLeftNote && nextRightNote && nextLeftNote.divisionOffset > nextRightNote.divisionOffset) {
      if (
        // @todo: handle voltas and anything else that might affect whether to obey a repeat
        // repeatCount === 0 &&
        currentRightNote.measure.number === nextRightNote.measure.number - 1 &&
        currentRightNote.measure.repeat &&
        currentRightNote.measure.repeat.direction === "backward"
      ) {
        return {
          repeated: true,
          leftHand: currentRightNote.measure.repeat.targetMeasure.items.leftHand,
          rightHand: currentRightNote.measure.repeat.targetMeasure.items.rightHand,
        };
      }

      next = {
        rightHand: nextRightNote,
      };
    }

    if (!next) {
      next = {
        leftHand: nextLeftNote,
        rightHand: nextRightNote,
      };
    }

    if (currentLeftNote && next.leftHand) {
      if (
        // @todo: handle voltas and anything else that might affect whether to obey a repeat
        repeatCount === 0 &&
        currentLeftNote.measure.number === nextLeftNote.measure.number - 1 &&
        currentLeftNote.measure.repeat &&
        currentLeftNote.measure.repeat.direction === "backward"
      ) {
        return {
          repeated: true,
          leftHand: currentLeftNote.measure.repeat.targetMeasure.items.leftHand[0],
          rightHand: currentLeftNote.measure.repeat.targetMeasure.items.rightHand[0],
        };
      }
    }

    if (currentRightNote && next.rightHand) {
      if (
        // @todo: handle voltas and anything else that might affect whether to obey a repeat
        repeatCount === 0 &&
        currentRightNote.measure.number === nextRightNote.measure.number - 1 &&
        currentRightNote.measure.repeat &&
        currentRightNote.measure.repeat.direction === "backward"
      ) {
        return {
          repeated: true,
          leftHand: currentRightNote.measure.repeat.targetMeasure.items.leftHand[0],
          rightHand: currentRightNote.measure.repeat.targetMeasure.items.rightHand[0],
        };
      }
    }

    return next;
  }

  /**
   * Gets the previous playable items before the current items
   * 
   * @param {PlayableItem} currentLeftNote - the playable item for the left hand to start from
   * @param {PlayableItem} currentRightNote - the playable item for the right hand to start from
   * 
   * @returns {{leftHand: PlayableItem, rightHand: PlayableItem}} the previous playable items
   */
  previousNotes({ currentLeftNote, currentRightNote } = {}) {
    const previousLeftNote = currentLeftNote ?
      currentLeftNote.previousItem :
      this.measures[1].items.leftHand[0];

    const previousRightNote = currentRightNote ?
      currentRightNote.previousItem :
      this.measures[1].items.rightHand[0];

    if (!previousLeftNote && !previousRightNote) {
      return null;
    }

    if (previousLeftNote && previousRightNote && previousLeftNote.divisionOffset > previousRightNote.divisionOffset) {
      return { leftHand: previousLeftNote };
    }
    else if (previousLeftNote && previousRightNote && previousLeftNote.divisionOffset < previousRightNote.divisionOffset) {
      return { rightHand: previousRightNote };
    }

    return {
      leftHand: previousLeftNote,
      rightHand: previousRightNote,
    };
  }
}
