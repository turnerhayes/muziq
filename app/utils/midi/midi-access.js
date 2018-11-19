/* global Promise */

import WebMIDI from "webmidi";

import fakeInput from "@app/utils/midi/FakeMIDIInput";

/**
 * Forces the MIDI loading promise to resolve. This can be useful in some cases when
 * HMR has reloaded the module but WebMIDI is still enabled so the promise can get
 * out of sync.
 * 
 * @function
 * 
 * @returns {void}
 */
let resolveMidiLoadPromise;

const midiLoadPromise = new Promise(
  (resolve, reject) => {
    let isResolved = false;

    resolveMidiLoadPromise = () => {
      if (!isResolved) {
        resolve();
      }
    };

    WebMIDI.enable((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();

      isResolved = true;
    });
  }
);

if (WebMIDI.enabled) {
  resolveMidiLoadPromise();
}

class MIDIAccessWrapper {
  get inputs() {
    if (!WebMIDI.enabled) {
      return [
        fakeInput,
      ];
    }

    return [
      ...WebMIDI.inputs,
      fakeInput,
    ];
  }

  get outputs() {
    if (!WebMIDI.enabled) {
      return [];
    }

    return WebMIDI.outputs;
  }

  getOutputById(id) {
    if (!WebMIDI.enabled) {
      return false;
    }

    return WebMIDI.getOutputById(id);
  }

  getInputById(id) {
    if (id === fakeInput.id) {
      return fakeInput;
    }

    if (!WebMIDI.enabled) {
      return false;
    }

    return WebMIDI.getInputById(id);
  }

  addInputListener(input, ...args) {
    if (typeof input === "string") {
      input = this.getInputById(input);
    }

    input.addListener(...args);
  }

  removeInputListener = (input, ...args) => {
    if (typeof input === "string") {
      input = this.getInputById(input);
    }

    input.removeListener(...args);
  };
}

const accessWrapper = new MIDIAccessWrapper();

export {
  accessWrapper,
  midiLoadPromise,
};
