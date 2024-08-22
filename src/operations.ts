import { Archetype } from './archetype';
import { Entity } from './core';
import { Schema, KindToType } from './schema';

export type AddEntityOp = {
  type: 'addEntity';
  entityId: Entity;
  archetype: Archetype<Schema[]>;
};

export type KillEntityOp = {
  type: 'killEntity';
  entityId: Entity;
};

export type SetComponentOp<S extends Schema> = {
  type: 'setComponent';
  entityId: Entity;
  schema: S;
  component?: KindToType<S>;
};

export type RemoveComponentOp<S extends Schema> = {
  type: 'removeComponent';
  entityId: Entity;
  schema: S;
};

export type Operation =
  | AddEntityOp
  | KillEntityOp
  | SetComponentOp<Schema>
  | RemoveComponentOp<Schema>;
