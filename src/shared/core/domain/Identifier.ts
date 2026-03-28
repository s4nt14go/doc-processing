export class Identifier<T> {
  private readonly _value;

  public constructor(value: T) {
    this._value = value;
  }

  public equals(id: Identifier<T>): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    if (!(id instanceof this.constructor)) {
      return false;
    }
    return id.value === this._value;
  }

  public toString() {
    return String(this._value);
  }

  /**
   * Return raw value of identifier
   */

  get value(): T {
    return this._value;
  }
}
