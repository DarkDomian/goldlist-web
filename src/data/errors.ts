export class DuplicateWordError extends Error {
  constructor() {
    super("you already knew that");
    this.name = "DuplicateWordError";
  }
}

export class CardNotFoundError extends Error {
  constructor() {
    super("Card not found");
    this.name = "CardNotFoundError";
  }
}
