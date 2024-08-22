import { Schema, SchemaId } from './schema';

export type Internals = {
  // # Components
  schemaIdBySchema: WeakMap<Schema, number>;
  schemaById: Map<number, Schema>;
  nextSchemaId: number;
};

export const UNSAFE_internals: Internals = {
  // # Schema
  schemaIdBySchema: new WeakMap(),
  schemaById: new Map(),
  nextSchemaId: 0,
};

(globalThis as any).__TECS_UNSAFE_INTERNALS__ = UNSAFE_internals;

export const clearUnsafeInternals = () => {
  UNSAFE_internals.schemaIdBySchema = new WeakMap();
  UNSAFE_internals.schemaById = new Map();
  UNSAFE_internals.nextSchemaId = 0;
};

export const $internalId = Symbol('internalId');

export const Internals = {
  registerSchema: (schema: Schema, schemaId?: SchemaId) => {
    let type = UNSAFE_internals.schemaIdBySchema.get(schema);
    if (type !== undefined) {
      return type;
    }
    type = schemaId;
    if (type === undefined) {
      while (UNSAFE_internals.schemaById.has(UNSAFE_internals.nextSchemaId)) {
        UNSAFE_internals.nextSchemaId++;
      }
      type = UNSAFE_internals.nextSchemaId;
    } else if (UNSAFE_internals.schemaById.has(type)) {
      throw new Error(
        'Failed to register component type: a component with same id is already registered'
      );
    }
    UNSAFE_internals.schemaById.set(type, schema);
    UNSAFE_internals.schemaIdBySchema.set(schema, type);

    // @ts-expect-error: this is just for debugging purpose
    schema[$internalId] = type;

    return type;
  },
  getSchemaId: (schema: Schema) => {
    let type = UNSAFE_internals.schemaIdBySchema.get(schema);
    if (type === undefined) {
      type = Internals.registerSchema(schema);
    }
    return type;
  },
  getSchemaById: (schemaId: SchemaId) => {
    return UNSAFE_internals.schemaById.get(schemaId);
  },
};
