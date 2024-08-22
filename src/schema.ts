// # Types
import { $defaultFn, $kind, $name, Id } from './core';
import { safeGuard } from './switch';

export type KindSt = {
  [$kind]: symbol;
  [$defaultFn]: () => unknown;
};

export function isKindSt(value: unknown): value is KindSt {
  return value !== null && typeof value === 'object' && $kind in value && $defaultFn in value;
}

// # Primitive types

export const $uint8 = Symbol('uint8');
export const $uint16 = Symbol('uint16');
export const $uint32 = Symbol('uint32');

export const $int8 = Symbol('int8');
export const $int16 = Symbol('int16');
export const $int32 = Symbol('int32');

export const $float32 = Symbol('float32');
export const $float64 = Symbol('float64');

export const $string8 = Symbol('string8');
export const $string16 = Symbol('string16');

export const $boolean = Symbol('boolean');

export const $number = $float64;
export const $string = $string16;

export const uint8 = {
  [$kind]: $uint8,
  byteLength: 1,
  [$defaultFn]: () => 0,
} as const;

export const uint16 = {
  [$kind]: $uint16,
  byteLength: 2,
  [$defaultFn]: () => 0,
} as const;

export const uint32 = {
  [$kind]: $uint32,
  byteLength: 4,
  [$defaultFn]: () => 0,
} as const;

export const int8 = {
  [$kind]: $int8,
  byteLength: 1,
  [$defaultFn]: () => 0,
} as const;

export const int16 = {
  [$kind]: $int16,
  byteLength: 2,
  [$defaultFn]: () => 0,
} as const;

export const int32 = {
  [$kind]: $int32,
  byteLength: 4,
  [$defaultFn]: () => 0,
} as const;

export const float32 = {
  [$kind]: $float32,
  byteLength: 4,
  [$defaultFn]: () => 0,
} as const;

export const float64 = {
  [$kind]: $float64,
  byteLength: 8,
  [$defaultFn]: () => 0,
} as const;

export const string8 = {
  [$kind]: $string8,
  byteLength: 1,
  [$defaultFn]: () => '',
};

export const string16 = {
  [$kind]: $string16,
  byteLength: 2,
  [$defaultFn]: () => '',
};

export const boolean = {
  [$kind]: $boolean,
  byteLength: 1,
  [$defaultFn]: () => false,
};

export const number = float64;
export const string = string16;

// ## Literal

export const $literal = Symbol('literal');

// export type literal<V extends string | number | boolean> = {
//   [$kind]: typeof $literal;
//   value: V;
//   byteLength: number;
//   [$defaultFn]: () => V;
// };

export type literal = ReturnType<typeof literal>;

export const literal = <V extends string | number | boolean>(
  value: V
): {
  [$kind]: typeof $literal;
  value: V;
  byteLength: number;
  [$defaultFn]: () => V;
} => {
  return {
    value,
    byteLength:
      typeof value === 'string'
        ? string.byteLength
        : typeof value === 'number'
        ? number.byteLength
        : boolean.byteLength,
    [$kind]: $literal,
    [$defaultFn]: () => value,
  };
};

export type PrimitiveKind =
  | typeof uint8
  | typeof uint16
  | typeof uint32
  | typeof int8
  | typeof int16
  | typeof int32
  | typeof float32
  | typeof float64
  | typeof string8
  | typeof string16
  | typeof boolean
  | typeof number
  | typeof string
  | literal;

export function isPrimitive(value: unknown): value is PrimitiveKind {
  return (
    isKindSt(value) &&
    (value[$kind] === $uint8 ||
      value[$kind] === $uint16 ||
      value[$kind] === $uint32 ||
      value[$kind] === $int8 ||
      value[$kind] === $int16 ||
      value[$kind] === $int32 ||
      value[$kind] === $float32 ||
      value[$kind] === $float64 ||
      value[$kind] === $string8 ||
      value[$kind] === $string16 ||
      value[$kind] === $boolean ||
      value[$kind] === $literal)
  );
}

export type PrimitiveToType<T> = T extends literal
  ? T['value']
  : T extends typeof uint8 | typeof uint16 | typeof uint32
  ? number
  : T extends typeof int8 | typeof int16 | typeof int32
  ? number
  : T extends typeof float32 | typeof float64
  ? number
  : T extends typeof string8 | typeof string16
  ? string
  : T extends typeof boolean
  ? boolean
  : never;

// # Complex types

export const $array = Symbol('array');
export const $union = Symbol('union');

// ## Array
export function arrayOf<K extends KindSt | Schema>(field: K) {
  return {
    field,
    [$kind]: $array,
    [$defaultFn]: () => [],
  };
}

// ## Union

export type union<V extends KindSt[]> = {
  variants: V;
  [$kind]: typeof $union;
  [$defaultFn]: () => KindToType<V[0]>;
};

export function union<V extends KindSt[]>(
  ...variants: V
): {
  variants: V;
  [$kind]: typeof $union;
  [$defaultFn]: () => KindToType<V[0]>;
} {
  if (variants.length === 0) {
    throw new Error('Union must have at least one variant');
  }

  return {
    variants,
    [$kind]: $union,
    [$defaultFn]: () => {
      return variants[0][$defaultFn]() as KindToType<V[0]>;
    },
  };
}

export type ArrayKind = ReturnType<typeof arrayOf>;
export type UnionKind = union<any>;

export type ComplexKind = ArrayKind | UnionKind;

export function isComplex(value: unknown): value is ComplexKind {
  return isKindSt(value) && (value[$kind] === $array || value[$kind] === $union);
}

export type ComplexToType<T> = T extends ArrayKind
  ? KindToType<T['field']>[]
  : T extends UnionKind
  ? T['variants'][number] extends PrimitiveKind
    ? PrimitiveToType<T['variants'][number]>
    : T['variants'][number] extends Schema
    ? SchemaToType<T['variants'][number]>
    : never
  : never;

// # Schema

export const $aos = Symbol('aos');
export const $soa = Symbol('soa');
export const $tag = Symbol('tag');

export type SchemaKind = typeof $aos | typeof $soa | typeof $tag;

export type Schema = {
  [key: string]: PrimitiveKind | ComplexKind | Schema | KindSt;
  [$kind]: SchemaKind;
  [$defaultFn]: () => unknown;
  [$name]?: string;
};

export type SchemaId = Id;

export function isSchema(value: unknown): value is Schema {
  return (
    typeof value === 'object' &&
    value !== null &&
    $kind in value &&
    (value[$kind] === $tag || value[$kind] === $aos || value[$kind] === $soa)
  );
}

export type SchemaToType<T> = T extends Schema
  ? { [K in keyof T as K extends symbol ? never : K]: KindToType<T[K]> }
  : never;

export type Component<S extends Schema> = SchemaToType<S>;

export function defaultFromSchema<S extends Omit<Schema, typeof $defaultFn>>(
  schema: S
): KindToType<S> {
  switch (schema[$kind]) {
    case $aos:
      const component = {} as KindToType<S>;
      for (const key in schema) {
        const field = schema[key];

        if (isKindSt(field)) {
          component[key as keyof KindToType<S>] = field[$defaultFn]() as any;
        } else {
          throw new Error('Invalid schema');
        }
      }
      return component;
    case $tag:
      return {} as KindToType<S>;
    case $soa:
      throw new Error('Not implemented');
    default:
      return safeGuard(schema[$kind]);
  }
}

export function newSchema<S extends Record<string, KindSt | PrimitiveKind | ComplexKind | Schema>>(
  schema: S,
  opts: {
    kind?: SchemaKind;
    defaultFn?: () => KindToType<S>;
    name?: string;
  } = {}
): S & { [$kind]: SchemaKind; [$defaultFn]: () => KindToType<S> } {
  const { kind, defaultFn, name } = opts;

  const newSchema: S & { [$kind]: SchemaKind; [$name]?: string } = {
    ...schema,
    [$kind]: kind ?? $aos,
  };

  if (name) {
    newSchema[$name] = name;
  }

  const newDefaultFn = defaultFn ?? (() => defaultFromSchema(newSchema));

  return {
    ...newSchema,
    [$defaultFn]: newDefaultFn,
  };
}

export const Schema = {
  new: newSchema,
  default: <S extends Schema>(schema: S): KindToType<S> => {
    switch (schema[$kind]) {
      case $tag:
      case $aos:
        return schema[$defaultFn]() as KindToType<S>;
      case $soa:
        throw new Error('Not implemented');
      default:
        return safeGuard(schema[$kind]);
    }
  },
};

// # Tag

export const newTag = (name?: string): Schema & { [$kind]: typeof $tag } => {
  return {
    [$kind]: $tag,
    [$defaultFn]: () => {},
    [$name]: name || '',
  };
};

export const Tag = {
  new: newTag,
};

// # Kind

export type Kind = PrimitiveKind | ComplexKind | SchemaKind;

export function isKind(value: unknown): value is Kind {
  return isPrimitive(value) || isComplex(value) || isSchema(value);
}

export type KindToType<T> = T extends PrimitiveKind
  ? PrimitiveToType<T>
  : T extends ComplexKind
  ? ComplexToType<T>
  : T extends Schema
  ? SchemaToType<T>
  : T extends KindSt
  ? ReturnType<T[typeof $defaultFn]>
  : never;
