import { areObjectsEqual, isPrimitive } from '../../utils/utils.ts';

export interface ValueObjectProps {
  [index: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * @desc ValueObjects are objects that we determine their
 * equality through their structural property.
 */

export abstract class ValueObject<T extends ValueObjectProps, ValueObjectDto> {
  public readonly props: T;
  public abstract toDto(): ValueObjectDto;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(theOther: ValueObject<T, ValueObjectDto>): boolean {
    if (theOther && theOther.props === undefined) {
      return false;
    }

    if (!isValueObject(theOther)) {
      return false;
    }

    if (this.constructor.name !== theOther.constructor.name) return false;

    const dto1 = this.toDto();
    const dto2 = theOther.toDto();

    if (isPrimitive(dto1) || isPrimitive(dto2)) {
      return dto1 === dto2;
    }

    return areObjectsEqual(dto1, dto2);
  }

  // Ver nota en Entity.ts acerca de assemble()
  // public static assemble(dto: TDto): T
}

const isValueObject = (
  v: unknown,
): v is ValueObject<ValueObjectProps, unknown> => {
  return v instanceof ValueObject;
};
