import NoteItem from "./NoteItem";
import RestItem from "./RestItem";
import { NoteNameToNumber } from "../Keyboard/midi-note-converter";
import RepeatItem from "./RepeatItem";

const getChordNoteNodes = ({ xmlDocument, startNote }) => {
  const staffNumber = Number(startNote.querySelector("staff").textContent);

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

class Measure {
  constructor({ number, divisionOffset, rightHandItems, leftHandItems, repeat }) {
    Object.freeze(rightHandItems);
    Object.freeze(leftHandItems);

    const items = Object.freeze({
      rightHand: rightHandItems,
      leftHand: leftHandItems,
    });
    
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

    return Object.freeze(number);
  }
}

export default class CleffLines {
  constructor({ partID, measures, divisionOffsets }) {
    Object.defineProperties(
      this,
      {
        measures: {
          enumerable: true,
          configurable: true,
          value: Object.freeze(measures),
        },

        partID: {
          enumerable: true,
          configurable: true,
          value: partID,
        },

        divisionOffsets: {
          enumerable: true,
          configurable: true,
          value: Object.freeze(divisionOffsets),
        },
      }
    );

    return Object.freeze(this);
  }

  static fromDocument({ xmlDocument, partID }) {
    let cumulativeDivisionsAtMeasureStart = 0;

    const measures = [];

    const divisionOffsets = {};
    
    const previousNoteItems = {
      left: null,
      right: null,
    };

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
          const staffNumber = Number(note.querySelector("staff").textContent);
          
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
  
            const notes = Object.freeze(
              [
                note,
                ...chordNoteNodes,
              ].map(
                (noteNode) => {
                  const name = noteNodeToName(noteNode);

                  return Object.freeze(
                    {
                      node: noteNode,
                      number: NoteNameToNumber(name),
                      name,
                    }
                  );
                }
              )
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

  nextNotes({ currentLeftNote, currentRightNote, repeatCount = 0 }) {
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

  previousNotes({ currentLeftNote, currentRightNote }) {
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
