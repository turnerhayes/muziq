import PlayableItem from "./PlayableItem";

export default class NoteItem extends PlayableItem {
  get isRest() {
    return false;
  }
  
  constructor({
    measure,
    divisionOffset,
    divisions,
    notes,
    hand,
    previousItem,
    nextItem,
  }) {
    super({
      measure,
      divisionOffset,
      divisions,
      hand,
      previousItem,
      nextItem,
    });
    
    Object.defineProperties(
      this,
      {
        notes: {
          enumerable: true,
          configurable: true,
          value: notes,
        },
      }
    );
  }
}
