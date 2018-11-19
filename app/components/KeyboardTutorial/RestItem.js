export default class RestItem {
  constructor({ measure, divisionOffset, divisions, hand, previousItem, nextItem }) {
    const siblings = {
      previous: previousItem,
      next: nextItem,
    };

    let measureObj = measure;

    Object.defineProperties(
      this,
      {
        measure: {
          configurable: true,
          enumerable: true,
          get() {
            return measureObj;
          },
          set(measure) {
            if (measureObj) {
              // eslint-disable-next-line no-console
              console.error(`RestItem: measure should not be set more than once`);
            }

            measureObj = measure;
          },
        },

        divisionOffset: {
          enumerable: true,
          configurable: true,
          value: divisionOffset,
        },

        divisions: {
          enumerable: true,
          configurable: true,
          value: divisions,
        },

        hand: {
          enumerable: true,
          configurable: true,
          value: hand,
        },

        previousItem: {
          configurable: true,
          enumerable: true,
          get() {
            return siblings.previous;
          },
          set(item) {
            if (siblings.previous) {
              // eslint-disable-next-line no-console
              console.error(`RestItem: previousItem should not be set more than once`);
            }

            siblings.previous = item;
          },
        },

        nextItem: {
          configurable: true,
          enumerable: true,
          get() {
            return siblings.next;
          },
          set(item) {
            if (siblings.next) {
              // eslint-disable-next-line no-console
              console.error(`RestItem: nextItem should not be set more than once`);
            }

            siblings.next = item;
          },
        },
      }
    );

    return Object.freeze(this);
  }
}
