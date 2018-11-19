/* global Uint8Array */

import WebMIDI from "webmidi";

import { NoteNumberToName, NoteNameToNumber } from "./midi-note-converter";

const fakeID = "FAKE_MIDI_INPUT";

const EVENT_TYPES_BY_STATUS_CODE = {};

for (const eventName in WebMIDI.MIDI_SYSTEM_MESSAGES) {
  if (WebMIDI.MIDI_SYSTEM_MESSAGES.hasOwnProperty(eventName)) {
    EVENT_TYPES_BY_STATUS_CODE[WebMIDI.MIDI_SYSTEM_MESSAGES[eventName]] = eventName;
  }
}

for (const eventName in WebMIDI.MIDI_CHANNEL_MESSAGES) {
  if (WebMIDI.MIDI_CHANNEL_MESSAGES.hasOwnProperty(eventName)) {
    EVENT_TYPES_BY_STATUS_CODE[WebMIDI.MIDI_CHANNEL_MESSAGES[eventName]] = eventName;
  }
}

const MAX_VELOCITY_VALUE = 127;

const DEFAULT_VELOCITY = 64;

class FakeMIDIInput {
  id = fakeID

  name = "Fake MIDI Input"

  connection = "open"

  state = "connected"

  type = "input"

  listenersByType = {}

  getVelocity(velocity = DEFAULT_VELOCITY, rawVelocity = true) {
    let parsedVelocity;

    if (rawVelocity) {
      parsedVelocity = parseFloat(velocity);
    } else {
      parsedVelocity = Math.round(velocity * MAX_VELOCITY_VALUE);
    }

    if (
      !Number.isNaN(parsedVelocity) &&
      parsedVelocity >= 0 &&
      parsedVelocity <= MAX_VELOCITY_VALUE
    ) {
      return parsedVelocity;
    }

    return velocity;
  }

  scheduleForSend(event, handler, timestamp) {
    if (timestamp <= WebMIDI.time) {
      handler({
        ...event,
        timestamp: WebMIDI.time,
      });
      return;
    }

    const rafCallback = () => {
      if (timestamp <= WebMIDI.time) {
        handler({
          ...event,
          timestamp: WebMIDI.time,
        });
      } else {
        requestAnimationFrame(rafCallback);
      }
    };

    requestAnimationFrame(rafCallback);
  }

  addListener(type, channel, handler) {
    if (!(type in this.listenersByType)) {
      this.listenersByType[type] = {};
    }

    if (!(channel in this.listenersByType[type])) {
      this.listenersByType[type][channel] = [];
    }
    
    this.listenersByType[type][channel].push(handler);
  }

  removeListener(type, channel, handler) {
    if (!this.listenersByType[type]) {
      return;
    }

    if (!this.listenersByType[type][channel]) {
      return;
    }

    if (!handler) {
      delete this.listenersByType[type][channel];
    }
    else {
      const index = this.listenersByType[type][channel].indexOf(handler);

      if (index >= 0) {
        this.listenersByType[type][channel].splice(index, 1);
      }
    }
  }

  parseNote(note) {
    if (typeof note === "string") {
      // @todo: handle octaveOffset setting
      return NoteNameToNumber(note);
    }

    return note;
  }

  parseTime(time) {
    if (time !== undefined) {
      let parsedTime;

      if (typeof time === "string" && time[0] === "+") {
        parsedTime = parseFloat(time);

        if (parsedTime > 0) {
          parsedTime = WebMIDI.time + parsedTime;
        }
      } else {
        parsedTime = parseFloat(time);
      }

      if (parsedTime > WebMIDI.time) {
        return parsedTime;
      }
    }

    return time;
  }

  toNoteArray(note) {
    let notes = note;

    if (!Array.isArray(note)) {
      notes = [note];
    }

    return notes.map(
      (note) => this.parseNote(note)
    );
  }

  send(status, data = [], timestamp = 0) {
    if (
      !(typeof status === "number" || status instanceof Number) ||
      // eslint-disable-next-line no-magic-numbers
      status < 128 || status > 255
    ) {
      throw new RangeError(`Status byte needs to be an integer between 128 and 255; was ${JSON.stringify(status)}`);
    }

    // eslint-disable-next-line no-magic-numbers
    const type = status >> 4;
    
    const eventName = EVENT_TYPES_BY_STATUS_CODE[type];

    // No handlers for this event--exit early
    if (!(eventName in this.listenersByType)) {
      return;
    }

    const event = {
      type: eventName,
      target: this,
      data: new Uint8Array(data),
    };

    const handlers = [];

    if (eventName in WebMIDI.MIDI_CHANNEL_MESSAGES) {
      // eslint-disable-next-line no-magic-numbers
      const channel = (status & 0xF) + 1;

      handlers.push(
        ...[
          ...(this.listenersByType[eventName][channel] || []),
          ...(this.listenersByType[eventName].all || []),
        ]
      );

      if (handlers.length === 0) {
        // No handlers for this channel or all channels--exit early
        return;
      }

      event.channel = channel;

      if (eventName === "noteon" || eventName === "noteoff") {
        // eslint-disable-next-line no-magic-numbers
        if (!data || data.length < 2) {
          throw new Error("Must provide 2 data bytes for noteon or noteoff events");
        }

        // eslint-disable-next-line no-magic-numbers
        const noteNumber = data[0] & 0x7FFF;
        // eslint-disable-next-line no-magic-numbers
        const velocity = data[1] & 0x7FFF;

        const { step, octave, alter } = NoteNumberToName(noteNumber);

        let alterSign = "";

        if (alter < 0) {
          alterSign = "b";
        }
        else if (alter > 0) {
          alterSign = "#";
        }

        const name = `${step}${alterSign}`;

        event.note = {
          number: noteNumber,
          name,
          // @todo: handle WebMIDI's octaveOffset parameter
          octave,
        };

        event.velocity = velocity / MAX_VELOCITY_VALUE;

        event.rawVelocity = velocity;
      }
    }

    handlers.forEach(
      (handler) => this.scheduleForSend(event, handler, timestamp)
    );
  }

  playNote(note, channel = "all", options = {}) {
    const notes = this.toNoteArray(note);
    
    const time = this.parseTime(options.time);

    notes.forEach(
      (note) => {
        this.sendNoteOn(note, channel, time);

        if (!Number.isNaN(options.duration)) {
          this.sendNoteOff(
            note,
            channel,
            (time || WebMIDI.time) + options.duration,
            {
              release: options.release,
            }
          );
        }
      }
    );
  }

  decrementRegisteredParameter() {}
  
  incrementRegisteredParameter() {}

  sendNoteOn(note, channel = "all", timestamp = 0, options = {}) {
    const channels = WebMIDI.toMIDIChannels(channel);

    const velocity = this.getVelocity(options.velocity, options.rawVelocity);

    this.toNoteArray(note).forEach(
      (note) => channels.forEach(
        (channel) => this.send(
          // eslint-disable-next-line no-magic-numbers
          (WebMIDI.MIDI_CHANNEL_MESSAGES.noteon << 4) | (channel - 1),
          [
            this.parseNote(note),
            velocity,
          ],
          timestamp
        )
      )
    );
  }

  sendNoteOff(note, channel = "all", timestamp = 0, options = {}) {
    const channels = WebMIDI.toMIDIChannels(channel);

    const release = this.getVelocity(
      "release" in options ?
        options.release :
        options.velocity,
      options.rawVelocity
    );

    this.toNoteArray(note).forEach(
      (note) => channels.forEach(
        (channel) => this.send(
          // eslint-disable-next-line no-magic-numbers
          (WebMIDI.MIDI_CHANNEL_MESSAGES.noteoff << 4) | (channel - 1),
          [
            this.parseNote(note),
            release,
          ],
          timestamp
        )
      )
    );
  }
  
  sendActiveSensing() {}
  
  sendChannelAftertouch() {}
  
  sendChannelMode() {}
  
  sendClock() {}
  
  sendContinue() {}
  
  sendControlChange() {}
  
  sendKeyAftertouch() {}
  
  sendPitchBend() {}
  
  sendProgramChange() {}
  
  sendReset() {}
  
  sendSongPosition() {}
  
  sendSongSelect() {}
  
  sendStart() {}
  
  sendStop() {}
  
  sendSysex() {}
  
  sendTimecodeQuarterFrame() {}
  
  sendTuningRequest() {}
  
  setMasterTuning() {}
  
  setModulationRange() {}
  
  setNonRegisteredParameter() {}
  
  setPitchBendRange() {}
  
  setRegisteredParameter() {}
  
  setTuningBank() {}
  
  setTuningProgram() {}
  
  stopNote() {}
}


export { FakeMIDIInput };

const instance = new FakeMIDIInput();

/// DEBUG
window.fakeMIDIInput = instance;
/// END DEBUG

export default instance;
