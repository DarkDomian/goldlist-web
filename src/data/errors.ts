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

export class EmptyExampleError extends Error {
  constructor() {
    super("An example cannot be empty");
    this.name = "EmptyExampleError";
  }
}

export class DuplicateExampleError extends Error {
  constructor() {
    super("That example already exists");
    this.name = "DuplicateExampleError";
  }
}

export class ExampleNotFoundError extends Error {
  constructor() {
    super("Example not found");
    this.name = "ExampleNotFoundError";
  }
}

export class InvalidSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSnapshotError";
  }
}
