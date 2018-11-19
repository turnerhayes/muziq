export default class MeasureStart {
  constructor({ measureNumber }) {
    this.measureNumber = measureNumber;

    return Object.freeze(this);
  }
}
