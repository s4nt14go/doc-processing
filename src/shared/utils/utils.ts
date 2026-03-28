type Diff<T, U> = T extends U ? never : T; // Remove types from T that are assignable to U

// Type of { ...L, ...R }
export type Spread<L, R> =
// Properties in L that don't exist in R
  Pick<L, Diff<keyof L, keyof R>> & R;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function areObjectsEqual(obj1: any, obj2: any) {
  if (obj1 === obj2) {
    return true;
  }

  if (isNull(obj1) || isNull(obj2)) {
    return false;
  }

  if (obj1.constructor.name !== obj2.constructor.name) return false;

  const obj1flatten = flattenObject(obj1);
  const obj2flatten = flattenObject(obj2);
  return deepEqual(obj1flatten, obj2flatten);
}

function isNull(some: unknown) {
  return some === null || some === undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenObject(obj: any, prefix?: string) {
  const flattened = Object();

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const prefixedKey = prefix ? prefix + key : key;

    if (isDate(value)) {
      flattened[prefixedKey] = value.getTime();
      continue;
    }

    if (isNull(value)) {
      flattened[prefixedKey] = value;
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        flattened[prefixedKey] = value;
        continue;
      }
      for (let i = 0; i < value.length; i++) {
        if (isNull(value[i])) {
          flattened[prefixedKey + i] = value;
          continue;
        }
        Object.assign(flattened, flattenObject(value[i], prefixedKey));
      }
    }

    if (typeof value === 'object') {
      Object.assign(flattened, flattenObject(value, prefixedKey));
    } else {
      flattened[prefixedKey] = value;
    }
  }
  return flattened;
}

export function isDate(value: unknown): boolean {
  return (
    !!value &&
    // @ts-expect-error
    typeof value.getTime === 'function' &&
    // @ts-expect-error
    !Number.isNaN(value.getTime())
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepEqual(object1: any, object2: any) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    const val1 = object1[key];
    const val2 = object2[key];
    const areObjects = isObject(val1) && isObject(val2);
    const areArrays = Array.isArray(val1) && Array.isArray(val2);
    if (
      ((areObjects || areArrays) && !deepEqual(val1, val2)) ||
      (!areObjects && !areArrays && val1 !== val2)
    ) {
      return false;
    }
  }

  return true;
}

export function isObject(object: unknown) {
  return !isNull(object) && typeof object === 'object' && !Array.isArray(object);
}

export const isPrimitive = (value: unknown) => !(value instanceof Object);