import { Entity, $kind } from './core';
import { SparseSet } from './sparse-set';
import { Schema, KindToType, SchemaId, $tag, $aos, $soa, Component } from './schema';
import { Internals } from './internals';
import { ArrayContains } from './ts-types';
import { safeGuard } from './switch';
import { isEntityInArchetype } from '.';

export type ArchetypeTableRow<S extends Schema> = KindToType<S>[];

export type ArchetypeTable<SL extends ReadonlyArray<Schema>> = {
  [K in keyof SL]: ArchetypeTableRow<SL[K]>;
};

export type ArchetypeId = string;

export const newArchetypeId = (schemas: Schema[]) => {
  return schemas
    .map((component) => Internals.getSchemaId(component))
    .sort((a, b) => a - b)
    .join(',');
};

export type Archetype<SL extends ReadonlyArray<Schema> = ReadonlyArray<Schema>> = {
  id: ArchetypeId;
  type: SL;
  entitiesSS: SparseSet;
  entities: number[]; // dense
  table: ArchetypeTable<SL>;
};

// OK, BUT can be changed to bitmask
// export function hasSchema<S extends Schema>(arch: Archetype<any>, schema: S): boolean {
//   const schemaId = Internals.getSchemaId(schema);
//   return arch.table[schemaId] !== undefined;
// }

export function hasSchema<SL extends ReadonlyArray<Schema>, S extends Schema>(
  arch: Archetype<SL>,
  schema: S
): Archetype<[S, ...SL]> | undefined {
  const schemaId = Internals.getSchemaId(schema);
  if (arch.table[schemaId] !== undefined) {
    return arch as unknown as Archetype<[S, ...SL]>;
  }

  return;
}

// OK
export function hasEntity(arch: Archetype<any>, entity: Entity) {
  const denseInd = arch.entitiesSS.sparse[entity];
  if (denseInd === undefined) {
    return false;
  }
  return arch.entitiesSS.dense[denseInd] === entity;
}

// OK
export function addArchetypeEntity<CL extends Schema[]>(arch: Archetype<CL>, entity: Entity) {
  // # Add entity to archetype
  SparseSet.add(arch.entitiesSS, entity);

  for (let i = 0; i < arch.type.length; i++) {
    const schema = arch.type[i];

    switch (schema[$kind]) {
      case $tag:
        continue;
      case $aos:
        const schemaId = Internals.getSchemaId(schema);

        const componentTable = arch.table[schemaId];

        if (!componentTable) {
          throw new Error(`Can't find component ${schemaId} on this archetype ${arch.id}`);
        }

        const component = Schema.default(schema);

        componentTable.push(component);
        break;
      case $soa:
        throw new Error('Not implemented');
      default:
        safeGuard(schema[$kind]);
    }
  }
}

// OK
export function removeEntity<CL extends Schema[]>(arch: Archetype<CL>, entity: Entity) {
  // # Remove entity and component to archetype
  const sSet = arch.entitiesSS;

  const denseInd = sSet.sparse[entity];

  if (sSet.dense[denseInd] === entity && sSet.dense.length > 0) {
    const swapEntity = sSet.dense.pop()!;

    for (let i = 0; i < arch.type.length; i++) {
      const schema = arch.type[i];

      switch (schema[$kind]) {
        case $tag:
          continue;
        case $aos:
          const componentId = Internals.getSchemaId(schema);

          const componentTable = arch.table[componentId];
          if (!componentTable) {
            continue;
          }

          const component = componentTable.pop()!;
          if (swapEntity !== entity) {
            componentTable[denseInd] = component;
          }
          break;
        case $soa:
          throw new Error('Not implemented');
        default:
          safeGuard(schema[$kind]);
      }
    }
    if (swapEntity !== entity) {
      sSet.dense[denseInd] = swapEntity;
      sSet.sparse[swapEntity] = denseInd;
    }
  }

  return;
}

/**
 *
 * Move entity from one archetype to another:
 *
 * 1. If `from` does not have entity or `to` already has entity then return false.
 * 2. Add entity to `to` archetype.
 * 3. Move all components to `to` archetype. If there is no component in `from` archetype,
 * then add default component.
 * 4. Remove entity from `from` archetype.
 *
 */
export function moveEntity<CL extends Schema[]>(
  from: Archetype<CL>,
  to: Archetype<CL>,
  entity: Entity,
  newSchema?: Schema,
  newComponent?: Component<Schema>
) {
  // # Check if entity is in `to` or not in `from`
  if (
    to.entitiesSS.dense[to.entitiesSS.sparse[entity]] === entity ||
    from.entitiesSS.dense[from.entitiesSS.sparse[entity]] !== entity
  ) {
    return false;
  }

  // # Add to new archetype
  SparseSet.add(to.entitiesSS, entity);

  // # Move all Components to new Archetype Table
  const fromDenseEntityInd = from.entitiesSS.sparse[entity]!;
  for (let i = 0; i < to.table.length; i++) {
    const schemaId = i;

    const toComponentTable = to.table[schemaId];
    if (!toComponentTable) {
      continue;
    }

    const fromComponentTable = from.table[schemaId];
    if (!fromComponentTable) {
      // # If there is schema in `to` but not in `from` then add default component
      updateComponent(to, entity, schemaId, undefined);
      continue;
    }

    const schema = Internals.getSchemaById(schemaId);
    if (!schema) {
      throw new Error(`Can't find schema ${schemaId}`);
    }

    switch (schema[$kind]) {
      case $tag:
        continue;
      case $soa:
        throw new Error('Not implemented');
      case $aos:
        updateComponent(to, entity, schemaId, fromComponentTable[fromDenseEntityInd]);
        break;
      default:
        safeGuard(schema[$kind]);
    }
  }

  // # Add new component if needed
  if (newSchema) {
    updateComponent(to, entity, newSchema, newComponent);
  }

  // # Remove it from `from` entities (sSet dense) and components
  Archetype.removeEntity(from, entity);
}

// OK
export function updateComponent<S extends Schema>(
  arch: Archetype<any>,
  entity: Entity,
  schemaOrId: SchemaId | Schema,
  component?: Component<S>
): boolean {
  const schemaId = typeof schemaOrId === 'number' ? schemaOrId : Internals.getSchemaId(schemaOrId);
  const schema = (typeof schemaOrId === 'number' ? Internals.getSchemaById(schemaOrId) : schemaOrId) as S | undefined;

  if (!schema) {
    throw new Error(`Can't find schema ${schemaId}`);
  }

  // # Add component to archetype
  const componentTable = arch.table[schemaId];

  if (!componentTable) {
    throw new Error(`Can't find component ${schemaId} on this archetype ${arch.id}`);
  }

  const sSet = arch.entitiesSS;
  const denseInd = sSet.sparse[entity] as number | undefined;

  const isEntityNotInArchetype =
    entity >= sSet.sparse.length ||
    denseInd === undefined ||
    denseInd >= sSet.dense.length ||
    sSet.dense[denseInd] !== entity;

  // # Check that component is not in this archetypes table
  if (isEntityNotInArchetype) {
    throw new Error(`Entity ${entity} is not in this archetype ${arch.id}`);
  }

  // # Set component if it is in this archetypes table
  switch (schema[$kind]) {
    case $tag:
      return true;
    case $aos:
      if (
        entity < sSet.sparse.length &&
        denseInd !== undefined &&
        denseInd < sSet.dense.length &&
        sSet.dense[denseInd] === entity
      ) {
        const newComponent = component ?? Schema.default(schema);
        componentTable[denseInd] = newComponent;
        return true;
      }
      return false;
    case $soa:
      throw new Error('Not implemented');
    default:
      return safeGuard(schema[$kind]);
  }
}

// OK
export function componentsList<SL extends ReadonlyArray<Schema>, A extends Archetype<any>>(
  archetype: A,
  entity: Entity,
  ...schemas: A extends Archetype<infer iCL> ? (ArrayContains<iCL, SL> extends true ? SL : never) : never
) {
  return schemas.map((schema) => {
    const schemaId = Internals.getSchemaId(schema);
    const componentIndex = archetype.entitiesSS.sparse[entity];
    return archetype.table[schemaId][componentIndex];
  }) as {
    [K in keyof SL]: KindToType<SL[K]>;
  };
}

// OK
export function component<S extends Schema, A extends Archetype<ReadonlyArray<Schema>>>(
  archetype: A,
  entity: Entity,
  schema: A extends Archetype<infer iCL>
    ? iCL extends any
      ? S
      : ArrayContains<iCL, [S]> extends true
      ? S
      : never
    : never
): KindToType<S> {
  const componentId = Internals.getSchemaId(schema);
  const componentIndex = archetype.entitiesSS.sparse[entity];
  const componentTable = archetype.table[componentId];
  if (!componentTable) {
    throw new Error(`Can't find component ${componentId} on this archetype ${archetype.id}`);
  }
  if (schema[$kind] === $tag) {
    return {} as KindToType<S>;
  }
  const component = componentTable[componentIndex];
  if (!component) {
    throw new Error(`Can't find component ${componentId} on this archetype ${archetype.id}`);
  }
  return component as KindToType<S>;
}

export function tryComponent<S extends Schema>(
  archetype: Archetype<any>,
  entity: Entity,
  schema: S
): KindToType<S> | undefined {
  if (!isEntityInArchetype(archetype, entity)) {
    return undefined;
  }
  const componentId = Internals.getSchemaId(schema);
  const componentIndex = archetype.entitiesSS.sparse[entity];
  const componentTable = archetype.table[componentId];
  if (!componentTable) {
    return undefined;
  }
  if (schema[$kind] === $tag) {
    return {} as KindToType<S>;
  }
  const component = componentTable[componentIndex];
  if (!component) {
    return undefined;
  }
  return component as KindToType<S> | undefined;
}

// OK
export const table = <S extends Schema, A extends Archetype<any>>(
  archetype: A,
  schema: A extends Archetype<infer iCL> ? (ArrayContains<iCL, [S]> extends true ? S : never) : never
) => {
  const componentId = Internals.getSchemaId(schema);
  const table = archetype.table[componentId];
  if (!table) {
    throw new Error(`Can't find component ${componentId} on this archetype ${archetype.id}`);
  }
  return table as ArchetypeTableRow<S>;
};

// OK
export const tryTable = <S extends Schema>(archetype: Archetype<any>, schema: S): ArchetypeTableRow<S> | undefined => {
  const componentId = Internals.getSchemaId(schema);
  return archetype.table[componentId] as ArchetypeTableRow<S> | undefined;
};

// OK
export const tablesList = <SL extends ReadonlyArray<Schema>, A extends Archetype<any>>(
  archetype: A,
  ...components: A extends Archetype<infer iCL> ? (ArrayContains<iCL, SL> extends true ? SL : never) : never
) => {
  return components.map((component) => {
    const componentId = Internals.getSchemaId(component);
    return archetype.table[componentId];
  }) as {
    [K in keyof SL]: KindToType<SL[K]>[];
  };
};

// OK
export const tryTablesList = <SL extends ReadonlyArray<Schema>>(archetype: Archetype<any>, ...components: SL) => {
  return components.map((component) => {
    const componentId = Internals.getSchemaId(component);
    return archetype.table[componentId];
  }) as {
    [K in keyof SL]: KindToType<SL[K]>[] | undefined;
  };
};

export function newArchetype<SL extends Schema[]>(...schemas: SL) {
  const ss = SparseSet.new();
  const archId = newArchetypeId(schemas);
  const archetype: Archetype<SL> = {
    id: archId,
    type: schemas,
    entitiesSS: ss,
    entities: ss.dense,
    table: schemas.reduce((acc, schema) => {
      acc[Internals.getSchemaId(schema)] = [];
      return acc;
    }, [] as ArchetypeTable<SL>),
  };

  return archetype;
}

export const archetypeZero = newArchetype();
export const archetypeZeroId = newArchetypeId(archetypeZero.type);

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Archetype = {
  new: newArchetype,
  hasSchema,
  hasEntity,
  componentsList,
  component,
  table,
  tablesList,
  updateComponent,
  addEntity: addArchetypeEntity,
  removeEntity,
  moveEntity,
};
