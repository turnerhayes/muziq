import { NoteNumberToName, NoteNameToNumber } from "./midi-note-converter";

const noteChart = {
  24: {
    step: "C",
    octave: 1,
  },
  23: {
    step: "B",
    octave: 0,
  },
  22: {
    step: "A",
    octave: 0,
    alter: 1,
  },
  21: {
    step: "A",
    octave: 0,
  },
  20: {
    step: "G",
    octave: 0,
    alter: 1,
  },
  19: {
    step: "G",
    octave: 0,
  },
  18: {
    step: "F",
    octave: 0,
    alter: 1,
  },
  17: {
    step: "F",
    octave: 0,
  },
  16: {
    step: "E",
    octave: 0,
  },
  15: {
    step: "D",
    octave: 0,
    alter: 1,
  },
  14: {
    step: "D",
    octave: 0,
  },
  13: {
    step: "C",
    octave: 0,
    alter: 1,
  },
  12: {
    step: "C",
    octave: 0,
  },
  11: {
    step: "B",
    octave: -1,
  },
  10: {
    step: "A",
    octave: -1,
    alter: 1,
  },
  9: {
    step: "A",
    octave: -1,
  },
  8: {
    step: "G",
    octave: -1,
    alter: 1,
  },
  7: {
    step: "G",
    octave: -1,
  },
  6: {
    step: "F",
    octave: -1,
    alter: 1,
  },
  5: {
    step: "F",
    octave: -1,
  },
  4: {
    step: "E",
    octave: -1,
  },
  3: {
    step: "D",
    octave: -1,
    alter: 1,
  },
  2: {
    step: "D",
    octave: -1,
  },
  1: {
    step: "C",
    octave: -1,
    alter: 1,
  },
  0: {
    step: "C",
    octave: -1,
  },
};

describe("MIDINoteConverter", () => {
  describe("NoteNumberToName", () => {
    it("should return the correct step, octave and alter values", () => {
      Object.keys(noteChart).forEach(
        (noteNumber) => {
          expect(NoteNumberToName(noteNumber)).toEqual(
            noteChart[noteNumber]
          );
        }
      );
    });
  });

  describe("NoteNameToNumber", () => {
    it("Should return the correct note number", () => {
      expect(NoteNameToNumber("A#0")).toBe(22);

      expect(NoteNameToNumber("C-2")).toBe(-12);

      expect(NoteNameToNumber("B5")).toBe(83);

      expect(NoteNameToNumber("A#5")).toBe(82);

      expect(NoteNameToNumber("D12")).toBe(158);
    });
  });
});
