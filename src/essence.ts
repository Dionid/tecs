import { $kind, Entity } from './core';
import {
  Archetype,
  archetypeZero,
  component,
  hasSchema,
  moveEntity,
  newArchetypeId,
  updateComponent,
} from './archetype';
import { clearUnsafeInternals, Internals } from './internals';
import { $tag, Schema, KindToType } from './schema';
import { Query } from './query';
import { System } from './system';
import { Operation } from './operations';
import { safeGuard } from './switch';
import { Topic } from './topic';
import {
  componentUpdated,
  entityKilled,
  entitySpawned,
  componentAdded,
  componentRemoved,
} from './default-topics';
import { mutableEmpty } from './array';

/**
 * Essence is a container for Entities, Components and Archetypes.
 */
export type Essence = {
  // # State
  isFirstStep: boolean;
  state: 'running' | 'idle';

  // # Time
  currentStepTime: number;
  lastStepTime: number;

  // # Entity
  nextEntityId: number;
  entityGraveyard: number[];

  // # Archetypes
  archetypeZero: Archetype<[]>;
  archetypesById: Map<string, Archetype<any>>;

  // # Entity Archetype
  archetypeByEntity: Array<Archetype<any> | undefined>;

  // # Systems
  systems: {
    onFirstStep: System[];
    preUpdate: System[];
    update: System[];
    postUpdate: System[];
  };

  // # Queries
  queries: Query<any>[];

  // # Topics
  topics: Topic<unknown>[];

  // # Deferred Operations
  deferredOperations: {
    deferred: boolean;
    operations: Operation[];
    killed: Set<Entity>;
  };
};

// # Entity

export const spawnEntity = <SL extends Schema[]>(essence: Essence, arch?: Archetype<SL>) => {
  // # Get new entity or reuse from graveyard
  let entity: number;
  if (essence.entityGraveyard.length > 0) {
    entity = essence.entityGraveyard.pop()!;
  } else {
    entity = essence.nextEntityId++;
  }

  // # Set specific archetype or use archetypeZero
  if (arch) {
    Archetype.addEntity(arch, entity);
    essence.archetypeByEntity[entity] = arch;
  } else {
    Archetype.addEntity(essence.archetypeZero, entity);
    essence.archetypeByEntity[entity] = essence.archetypeZero;
  }

  // # Emit entity spawned event
  if (entitySpawned.isRegistered) {
    Topic.emit(entitySpawned, { name: 'entity-spawned', entity }, true);
  }

  return entity;
};

export const killEntity = (essence: Essence, entity: number): void => {
  // # If already must be killed, return
  if (essence.deferredOperations.killed.has(entity)) {
    return;
  }

  // # If essence in deferred state, than defer
  if (essence.deferredOperations.deferred) {
    essence.deferredOperations.operations.push({
      type: 'killEntity',
      entityId: entity,
    });
    return;
  }

  // # Move entity to graveyard
  essence.entityGraveyard.push(entity);

  // # Remove entity from archetype
  const archetype = essence.archetypeByEntity[entity];
  if (!archetype) {
    throw new Error(`Can't find archetype for entity ${entity}`);
  }
  Archetype.removeEntity(archetype, entity);
  essence.archetypeByEntity[entity] = undefined;

  // # Emit killed event
  if (entityKilled.isRegistered) {
    Topic.emit(entityKilled, { name: 'entity-killed', entity }, true);
  }
};

// # Archetype

export const findOrCreateArchetype = <SL extends Schema[]>(
  essence: Essence,
  ...schemas: SL
): Archetype<SL> => {
  const archId = newArchetypeId(schemas);

  let archetype = essence.archetypesById.get(archId) as Archetype<SL> | undefined;

  if (archetype !== undefined) {
    return archetype;
  }

  // # Create new Archetype
  const newArchetype = Archetype.new(...schemas);

  // # Index new Archetype
  essence.archetypesById.set(newArchetype.id, newArchetype);

  // # Add to queries
  essence.queries.forEach((query) => {
    Query.tryAddArchetype(query, newArchetype);
  });

  return newArchetype;
};

export const registerArchetype = <SL extends Schema[]>(
  essence: Essence,
  newArchetype: Archetype<SL>
): Archetype<SL> => {
  const archId = newArchetypeId(newArchetype.type);

  let existingArchetype = essence.archetypesById.get(archId) as Archetype<SL> | undefined;

  if (existingArchetype !== undefined) {
    return existingArchetype;
  }

  // # Index new Archetype
  essence.archetypesById.set(newArchetype.id, newArchetype);

  // # Add to queries
  essence.queries.forEach((query) => {
    Query.tryAddArchetype(query, newArchetype);
  });

  return newArchetype;
};

export function addEntity<CL extends Schema[]>(
  essence: Essence,
  arch: Archetype<CL>,
  entity: Entity
): void {
  if (essence.deferredOperations.deferred) {
    essence.deferredOperations.operations.push({
      type: 'addEntity',
      entityId: entity,
      archetype: arch,
    });
    return;
  }

  Archetype.addEntity(arch, entity);
}

// OK
/**
 *
 * By setting component to entity, we will take current Archetype of entity,
 * and if schema is already in Archetype, than just update Component.
 * If not, we will find / create new Archetype, that will contain all components from
 * current Archetype and new component, and move entity and all its Components to
 * this new Archetype.
 *
 * @param essence
 * @param entity
 * @param schema
 * @param newComponent
 * @returns
 */
export const setComponent = <S extends Schema>(
  essence: Essence,
  entity: Entity,
  schema: S,
  newComponent?: S[typeof $kind] extends typeof $tag ? never : KindToType<S>
): void => {
  if (essence.deferredOperations.deferred) {
    essence.deferredOperations.operations.push({
      type: 'setComponent',
      entityId: entity,
      schema,
      component: newComponent,
    });
    return;
  }

  const schemaId = Internals.getSchemaId(schema);

  // # Get current archetype
  let archetype = essence.archetypeByEntity[entity] as Archetype<any> | undefined;
  if (archetype === undefined) {
    throw new Error(`Can't find archetype for entity ${entity}`);
  }

  // # If schema is already in archetype, than just update Component
  if (hasSchema(archetype, schema)) {
    const oldComponent = component(archetype, entity, schema);

    updateComponent(archetype, entity, schemaId, newComponent);

    if (componentUpdated.isRegistered) {
      Topic.emit(
        componentUpdated,
        { name: 'component-updated', entity, schema, old: oldComponent, new: newComponent },
        true
      );
    }

    return;
  }

  // # If not, create new Archetype
  const newArchetype = findOrCreateArchetype(
    essence,
    schema,
    ...archetype.type
  ) as unknown as Archetype<[S]>;

  // # Index archetype by entity
  essence.archetypeByEntity[entity] = newArchetype;

  // # Move Entity to new Archetype
  moveEntity(archetype, newArchetype, entity, schema, newComponent);

  // # Emit event of new component added
  if (componentAdded.isRegistered) {
    Topic.emit(
      componentAdded,
      { name: 'component-added', entity, schema, component: newComponent },
      true
    );
  }

  return;
};

// OK
/**
 *
 * By removing component from entity, we will find / create Archetype, that
 * will not contain this component, but will contain all other components from
 * current Archetype, and move entity and Components to this new Archetype.
 *
 * @param essence
 * @param entity
 * @param schema
 * @returns
 *
 * @example
 */
export const removeComponent = <S extends Schema>(
  essence: Essence,
  entity: Entity,
  schema: S
): void => {
  if (essence.deferredOperations.deferred) {
    essence.deferredOperations.operations.push({
      type: 'removeComponent',
      entityId: entity,
      schema,
    });
    return;
  }

  // # Get current archetype
  let currentArchetype = essence.archetypeByEntity[entity] as Archetype<Schema[]> | undefined;
  if (currentArchetype === undefined) {
    throw new Error(`Can't find archetype for entity ${entity}`);
  }

  // # If component is not in archetype, return
  if (!Archetype.hasSchema(currentArchetype, schema)) {
    return;
  }

  // # Find or create new archetype
  const newArchetype = Essence.createArchetype(
    essence,
    ...currentArchetype.type.filter((c) => c !== schema)
  );

  // # Index archetype by entity
  essence.archetypeByEntity[entity] = newArchetype;

  // # Get removing schema component
  const oldComponent = component(currentArchetype, entity, schema);

  // # Move entity to new archetype
  moveEntity(currentArchetype, newArchetype, entity);

  if (componentRemoved.isRegistered) {
    Topic.emit(
      componentRemoved,
      { name: 'component-removed', entity, schema, component: oldComponent },
      true
    );
  }

  return;
};

// # Queries

// TODO: add query index by id to check for similar filters
export function registerQuery<Q extends Query<Schema[]>>(essence: Essence, query: Q): Q {
  if (essence.queries.includes(query)) {
    return query;
  }

  essence.queries.push(query);

  essence.archetypesById.forEach((archetype) => {
    Query.tryAddArchetype(query, archetype);
  });

  return query;
}

export function applyDeferredOp(essence: Essence, operation: Operation): void {
  switch (operation.type) {
    case 'addEntity':
      addEntity(essence, operation.archetype, operation.entityId);
      break;
    case 'killEntity':
      killEntity(essence, operation.entityId);
      break;
    case 'setComponent':
      setComponent(essence, operation.entityId, operation.schema, operation.component);
      break;
    case 'removeComponent':
      removeComponent(essence, operation.entityId, operation.schema);
      break;
    default:
      return safeGuard(operation);
  }
}

export function registerSystem(
  essence: Essence,
  system: System,
  opts: {
    stage?: 'onFirstStep' | 'preUpdate' | 'update' | 'postUpdate';
  } = {}
) {
  const type = opts.stage;

  essence.systems[type || 'update'].push(system);
}

export function registerTopic<T extends Topic<unknown>>(essence: Essence, topic: T): T {
  if (essence.topics.includes(topic)) {
    return topic;
  }

  essence.topics.push(topic);
  topic.isRegistered = true;

  return topic;
}

export function _step(essence: Essence, now: number, deltaTime: number, deltaMs: number): void {
  // # Set state
  essence.state = 'running';
  essence.currentStepTime = now;
  if (essence.lastStepTime === 0) {
    essence.lastStepTime = now;
  }

  // # Execute systems

  // ## Set deferred
  essence.deferredOperations.deferred = true;

  // ## Run only on first step
  if (essence.isFirstStep) {
    for (let i = 0, l = essence.systems.onFirstStep.length; i < l; i++) {
      const system = essence.systems.onFirstStep[i];
      system({
        stage: 'onFirstStep',
        essence,
        deltaTime,
        deltaMs,
        elapsedTime: now,
      });
    }
  }

  // ## Pre update
  for (let i = 0, l = essence.systems.preUpdate.length; i < l; i++) {
    const system = essence.systems.preUpdate[i];
    system({
      essence,
      deltaTime,
      elapsedTime: now,
      deltaMs,
      stage: 'preUpdate',
    });
  }

  // ## Update
  for (let i = 0, l = essence.systems.update.length; i < l; i++) {
    const system = essence.systems.update[i];
    system({
      essence,
      deltaTime,
      elapsedTime: now,
      deltaMs,
      stage: 'update',
    });
  }

  // ## Post update
  for (let i = 0, l = essence.systems.postUpdate.length; i < l; i++) {
    const system = essence.systems.postUpdate[i];
    system({
      essence,
      deltaTime,
      elapsedTime: now,
      deltaMs,
      stage: 'postUpdate',
    });
  }

  // ## Reset deferred
  essence.deferredOperations.deferred = false;

  // # Execute deferred operations
  const operations = essence.deferredOperations.operations;

  for (let i = 0; i < operations.length; i++) {
    applyDeferredOp(essence, operations[i]);
  }

  mutableEmpty(essence.deferredOperations.operations);

  // # Flush topics
  for (let i = 0; i < essence.topics.length; i++) {
    Topic.flush(essence.topics[i]);
  }

  // ## Reset killed
  essence.deferredOperations.killed.clear();

  // ## Reset state
  essence.lastStepTime = now;
  essence.state = 'idle';
  essence.isFirstStep = false;
}

export function stepWithTicker(
  essence: Essence,
  ticker: {
    deltaTime: number;
    deltaMS: number;
    elapsedMS: number;
    speed: number;
  }
): void {
  return _step(essence, performance.now(), ticker.deltaTime, ticker.deltaMS);
}

export function step(essence: Essence): void {
  // # Set state
  const now = performance.now();
  let deltaMs = Math.max(0, now - essence.lastStepTime);
  let deltaTime = deltaMs * 0.06;

  return _step(essence, now, deltaTime, deltaMs);
}

export function newEssence(
  props: {
    queries?: Query<any>[];
    topics?: Topic<unknown>[];
    systems?: {
      onFirstStep?: System[];
      preUpdate?: System[];
      update?: System[];
      postUpdate?: System[];
    };
  } = {}
): Essence {
  const archetypesById = new Map();
  archetypesById.set(archetypeZero.id, archetypeZero);

  return {
    isFirstStep: true,
    state: 'idle',
    currentStepTime: 0,
    lastStepTime: 0,
    nextEntityId: 1,
    archetypeZero,
    entityGraveyard: [],
    archetypesById,
    archetypeByEntity: [],
    systems: {
      onFirstStep: props.systems ? props.systems.onFirstStep ?? [] : [],
      preUpdate: props.systems ? props.systems.preUpdate ?? [] : [],
      update: props.systems ? props.systems.update ?? [] : [],
      postUpdate: props.systems ? props.systems.postUpdate ?? [] : [],
    },
    queries: props.queries ?? [],
    topics: props.topics ?? [],
    deferredOperations: {
      deferred: false,
      operations: [],
      killed: new Set(),
    },
  };
}

// # OK
export const destroyEssence = (essence: Essence) => {
  for (const topic of essence.topics) {
    topic.isRegistered = false;
    mutableEmpty(topic.staged);
    mutableEmpty(topic.ready);
  }

  // # Reset deferred operations
  essence.deferredOperations.deferred = false;
  essence.deferredOperations.killed.clear();
  mutableEmpty(essence.deferredOperations.operations);

  // # Reset queries
  for (const query of essence.queries) {
    mutableEmpty(query.archetypes);
  }

  clearUnsafeInternals();
};

export function run(essence: Essence): void {
  const frame = () => {
    step(essence);
    requestAnimationFrame(frame);
  };
  frame();
}

// OK
export const immediately = (essence: Essence, fn: () => void) => {
  essence.deferredOperations.deferred = false;
  fn();
  essence.deferredOperations.deferred = true;
};

// OK
export const registerSchema = Internals.registerSchema;

// OK
export const getSchemaId = Internals.getSchemaId;

// OK
export const archetypeByEntity = (essence: Essence, entity: Entity) =>
  essence.archetypeByEntity[entity]!;

// OK
export const hasComponent = <S extends Schema>(
  essence: Essence,
  entity: Entity,
  schema: S
): boolean => {
  const archetype = essence.archetypeByEntity[entity];
  if (!archetype) {
    throw new Error(`Can't find archetype for entity ${entity}`);
  }

  return !!Archetype.hasSchema(archetype, schema);
};

// OK
export const componentByEntity = <S extends Schema>(
  essence: Essence,
  entity: Entity,
  schema: S
): KindToType<S> | undefined => {
  const archetype = essence.archetypeByEntity[entity];
  if (!archetype) {
    throw new Error(`Can't find archetype for entity ${entity}`);
  }

  if (!Archetype.hasSchema(archetype, schema)) {
    return;
  }

  if (!Archetype.hasEntity(archetype, entity)) {
    return;
  }

  return Archetype.component(archetype, entity, schema);
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Essence = {
  new: newEssence,
  archetypeByEntity,

  // # Entity
  spawnEntity,
  killEntity,
  hasComponent,
  componentByEntity,

  // # Components
  registerSchema,
  getSchemaId,

  // # Archetypes
  createArchetype: findOrCreateArchetype,
  registerArchetype,

  // # Archetypes Entities & Components
  // ## Get
  table: Archetype.table,
  tablesList: Archetype.tablesList,
  component: Archetype.component,
  componentsList: Archetype.componentsList,

  // ## Set
  setComponent,
  removeComponent,

  // # System
  registerSystem,

  // # Query
  registerQuery,

  // # Topics
  registerTopic,

  // # Step
  step,
  immediately,
};
