import { EntityID } from './EntityID.ts';
import { areObjectsEqual } from '../../utils/utils.ts';

export abstract class Entity<T, TDto> {
  protected readonly _id: EntityID;
  public readonly props: T;
  protected abstract toDto(): TDto;

  protected constructor(props: T, id?: EntityID) {
    this._id = id ? id : new EntityID();
    this.props = props;
  }

  public equals(theOther: Entity<T, TDto>): boolean {
    if (theOther && theOther.props === undefined) {
      return false;
    }

    if (!isEntity(theOther)) {
      return false;
    }

    if (this.constructor.name !== theOther.constructor.name) return false;

    return areObjectsEqual(this.toDto(), theOther.toDto());
  }

  // Según la conveniencia, se puede implementar assemble() para crear una entidad a partir de un DTO
  // public static assemble(dto: TDto): T
  // En assemble() se puede usar el mét0do create() o el constructor de la entidad.
  // Usar el mét0do create() es más seguro ya que se aplican las validaciones que pueden haber quedado desincronizadas con los valores del repositorio y es bueno que el mét0do create() lo ponga de manifiesto fallando si no se cumplen dichas validaciones.
  // Pero en algunas ocasiones el input que se usa con create() no es igual a las props de la Entity, por lo que en ese caso hace falta usar el constructor de la entidad. Ejemplos de unit tests de este caso:
  // Caso simple: src/modules/reservation/domain/Reservation.unit.ts
  // Caso complejo: src/modules/reservation/domain/ReservationOption.unit.ts
}

const isEntity = (v: unknown): v is Entity<unknown, unknown> => {
  return v instanceof Entity;
};
