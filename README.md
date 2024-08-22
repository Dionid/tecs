# tECS – TypeScript ECS library

Archetype based ECS library for TypeScript.

# Design

1. Id – number id
1. Entity – number id to bind Components to
1. Schema – describes component shape (data structure) and Component serialization / deserialization rules
1. Component – instance of Schema
1. Tag – instance of Schema without data (empty object {})
1. Archetype – identified by Components and contains dense Entities and Components
1. Query – described by Component filters, returns Archetype pointers containing
1. Essence – contains Entities, Archetypes, Queries and indexes
1. Internals – contains registered Schemas
1. Event Driven – create custom events
1. Change Detection – contains changes to Entities and Components

# Features

1. Schema -> string, number, boolean, array, union, literal
1. Components and Tags
1. Archetypes
1. Events on Topics
1. Default events (entitySpawned, entityKilled, componentAdded, componentRemoved, componentUpdated)
1. Archetype Queries with cache
1. Defer add and remove entities and components
1. No external dependencies

# Roadmap

1. SoA components
1. Serialize Essence
1. Queries Filters
1. Singleton Component
1. Register System before / after other System
1. BitMask
1. Essence size
1. Custom Errors
