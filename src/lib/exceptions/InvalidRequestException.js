export class InvalidRequestException extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidRequestException';
    this.code = 400;
  }
}
