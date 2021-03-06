export function NoteNumberToName(note) {
  let step;
  let alter;
  // eslint-disable-next-line no-magic-numbers
  let octave = Math.floor(note / 12) - 1;

  /* eslint-disable no-fallthrough */
  /* eslint-disable no-magic-numbers */
  switch (note % 12) {
    case 1:
      alter = 1;
    case 0:
      step = "C";
      break;
    case 3:
      alter = 1;
    case 2:
      step = "D";
      break;
    case 4:
      step = "E";
      break;
    case 6:
      alter = 1;
    case 5:
      step = "F";
      break;
    case 8:
      alter = 1;
    case 7:
      step = "G";
      break;
    case 10:
      alter = 1;
    case 9:
      step = "A";
      break;
    case 11:
      step = "B";
      break;
  }
  /* eslint-enable no-magic-numbers */
  /* eslint-enable no-fallthrough */
  
  const noteObj = {
    step,
    octave,
  };

  if (alter) {
    noteObj.alter = alter;
  }

  return noteObj;
}

const stepToNumber = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const steps = "ABCDEFG";

export function NoteNameToNumber(noteName) {
  const matches = /^([A-G])([#b])?(-?\d+)$/.exec(noteName);

  if (!matches) {
    return null;
  }

  let [step, alter, octave] = Array.from(matches).slice(1);

  octave = Number(octave);

  if (alter === "b") {
    alter = "#";
    step = steps[
      (steps.indexOf(step) + steps.length - 1) % steps.length 
    ];
    octave -= 1;
  }

  let number = stepToNumber[step];

  if (alter === "#") {
    number += 1;
  }

  // eslint-disable-next-line no-magic-numbers
  return number + ((octave + 1) * 12);
}
