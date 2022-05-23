export class InvalidArgumentException extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidArgumentException';
    this.code = 400;
  }
}
