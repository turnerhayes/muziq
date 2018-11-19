import PlayableItem from "./PlayableItem";

export default class RestItem extends PlayableItem {
  get isRest() {
    return true;
  }
  
  constructor({ measure, divisionOffset, divisions, hand, previousItem, nextItem }) {
    super(({
      measure,
      divisionOffset,
      divisions,
      hand,
      previousItem,
      nextItem
    }));
  }
}
