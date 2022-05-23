export class BusinessRuleException extends Error {
  constructor(message) {
    super(message);
    this.name = 'BusinessRuleException';
    this.code = 400;
  }
}
