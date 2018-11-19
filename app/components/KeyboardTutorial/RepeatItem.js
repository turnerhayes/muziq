export default class RepeatItem {
  constructor({ measureNumber, direction, targetMeasure }) {
    this.measureNumber = measureNumber;
    this.direction = direction;

    if (targetMeasure) {
      this.targetMeasure = targetMeasure;
    }

    return Object.freeze(this);
  }
}
