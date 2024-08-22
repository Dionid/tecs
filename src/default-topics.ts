import { Entity } from './core';
import { Component, Schema } from './schema';
import { newTopic } from './topic';

// # Entity spawned

export type EntitySpawned = {
  name: 'entity-spawned';
  entity: Entity;
};

export const entitySpawned = newTopic<EntitySpawned>();

// # Entity killed

export type EntityKilled = {
  name: 'entity-killed';
  entity: Entity;
};

export const entityKilled = newTopic<EntityKilled>();

// # Schema added

export type ComponentAdded<S extends Schema> = {
  name: 'component-added';
  entity: Entity;
  schema: S;
  component?: Component<S>;
};

export const componentAdded = newTopic<ComponentAdded<any>>();

// # Schema removed

export type ComponentRemoved<S extends Schema> = {
  name: 'component-removed';
  entity: Entity;
  schema: S;
  component?: Component<S>;
};

export const componentRemoved = newTopic<ComponentRemoved<any>>();

// # Schema updated

export type ComponentUpdated<S extends Schema> = {
  name: 'component-updated';
  entity: Entity;
  schema: S;
  old?: Component<S>;
  new?: Component<S>;
};

export const componentUpdated = newTopic<ComponentUpdated<any>>();
