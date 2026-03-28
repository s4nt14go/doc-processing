import { Identifier } from './Identifier.ts';

export class EntityID extends Identifier<string | number> {
  public constructor(id?: string | number) {
    super(id ? id : crypto.randomUUID());
  }
}
