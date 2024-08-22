import { Essence, Schema, number, Tag, arrayOf, string, Context } from './index';
import { Query } from './query';

const Position = Schema.new({
  x: number,
  y: number,
});

const Velocity = Schema.new({
  x: number,
  y: number,
});

const Speed = Schema.new({
  value: number,
});

const Player = Tag.new();

const Comments = Schema.new({
  value: arrayOf(string),
});

const NamedTags = Schema.new({
  value: arrayOf(arrayOf(string)),
});

export const withoutQuery = () => {
  const essence = Essence.new();

  const archetype1 = Essence.createArchetype(essence, Position, Speed);

  const byGetComponentTable = () => {};

  byGetComponentTable();

  const byGetComponentTablesList = () => {
    const [position] = Essence.tablesList(archetype1, Position);
    const [speed] = Essence.tablesList(archetype1, Speed, Position);

    // TODO: MUST BE ERROR
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [velocity] = Essence.tablesList(archetype1, Velocity);

    for (let i = 0; i < archetype1.entities.length; i++) {
      position[i].x += 1;
      position[i].y += 1;

      speed[i].value += 1;
    }
  };

  byGetComponentTablesList();

  const byGetComponentsList = () => {
    for (const entity of archetype1.entities) {
      const [position, speed] = Essence.componentsList(archetype1, entity, Position, Speed);
      // @ts-expect-error: Velocity is not in the archetype
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [velocity] = Essence.componentsList(essence, archetype1, entity, Velocity);

      position.x += 1;
      position.y += 1;

      speed.value += 1;
    }
  };

  byGetComponentsList();

  const byGetComponent = () => {
    for (const entity of archetype1.entities) {
      const position = Essence.component(archetype1, entity, Position);
      const speed = Essence.component(archetype1, entity, Speed);
      // @ts-expect-error: Velocity is not in the archetype
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [velocity] = Essence.component(archetype1, entity, Velocity);

      position.x += 1;
      position.y += 1;

      speed.value += 1;
    }
  };

  byGetComponent();
};

describe('aws', () => {
  it('should move entity', () => {
    const essence = Essence.new();

    const PositionArchetype = Essence.createArchetype(essence, Position);

    expect(PositionArchetype.type.length).toEqual(1);

    const SpeedArchetype = Essence.createArchetype(essence, Speed);

    expect(SpeedArchetype.type.length).toEqual(1);

    const MovementArchetype = Essence.createArchetype(essence, Position, Speed);

    expect(MovementArchetype.type.length).toEqual(2);

    const entity = Essence.spawnEntity(essence);

    Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });

    // console.log('PositionArchetype', PositionArchetype.entities, PositionArchetype.table);

    expect(PositionArchetype.entities.length).toEqual(1);
    expect(PositionArchetype.table[0].length).toEqual(1);

    Essence.setComponent(essence, entity, Speed, { value: 5 });

    expect(PositionArchetype.entities.length).toEqual(0);
    expect(PositionArchetype.table[0].length).toEqual(0);

    expect(SpeedArchetype.entities.length).toEqual(0);
    // @ts-expect-error: can't find other way
    expect(SpeedArchetype.table[1].length).toEqual(0);

    expect(MovementArchetype.entities.length).toEqual(1);
    expect(MovementArchetype.table[0].length).toEqual(1);
    expect(MovementArchetype.table[1].length).toEqual(1);
  });

  describe('tag', () => {
    it('should be added', () => {
      const essence = Essence.new();

      const PositionArchetype = Essence.createArchetype(essence, Position);
      const PlayerPositionArchetype = Essence.createArchetype(essence, Position, Player);

      expect(PositionArchetype.type.length).toEqual(1);

      const entity = Essence.spawnEntity(essence);

      Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });

      expect(PositionArchetype.entities.length).toEqual(1);
      expect(PositionArchetype.table[0].length).toEqual(1);

      Essence.setComponent(essence, entity, Player);

      expect(PlayerPositionArchetype.entities.length).toEqual(1);
      expect(PlayerPositionArchetype.table[Essence.getSchemaId(Position)].length).toEqual(1);
      expect(PlayerPositionArchetype.table[Essence.getSchemaId(Player)].length).toEqual(0);
    });
  });

  describe('spawn and kill entity', () => {
    it('should be 0 in the end', () => {
      const essence = Essence.new();
      expect(essence.entityGraveyard.length).toEqual(0);

      const PositionArchetype = Essence.createArchetype(essence, Position);

      expect(PositionArchetype.entities.length).toEqual(0);

      const entity = Essence.spawnEntity(essence, PositionArchetype);

      expect(PositionArchetype.entities.length).toEqual(1);

      Essence.killEntity(essence, entity);

      expect(PositionArchetype.entities.length).toEqual(0);
      expect(essence.entityGraveyard.length).toEqual(1);
    });
    it('should be 0 in the end 1', () => {
      const essence = Essence.new();
      expect(essence.entityGraveyard.length).toEqual(0);

      const PositionArchetype = Essence.createArchetype(essence, Position);

      expect(PositionArchetype.entities.length).toEqual(0);

      const entity = Essence.spawnEntity(essence);

      Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });

      expect(PositionArchetype.entities.length).toEqual(1);

      Essence.killEntity(essence, entity);

      expect(essence.entityGraveyard.length).toEqual(1);
      expect(PositionArchetype.entities.length).toEqual(0);
    });
    it('should be 0 in the end 2', () => {
      const essence = Essence.new();
      expect(essence.entityGraveyard.length).toEqual(0);

      const PositionArchetype = Essence.createArchetype(essence, Position);

      expect(PositionArchetype.entities.length).toEqual(0);

      const num = 100;

      const entities = [];

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
        entities.push(entity);
      }

      expect(PositionArchetype.entities.length).toEqual(num);

      for (const entity of entities) {
        Essence.killEntity(essence, entity);
      }

      expect(essence.entityGraveyard.length).toEqual(num);
      expect(PositionArchetype.entities.length).toEqual(0);
    });
  });

  describe('query', () => {
    it('should get entities', () => {
      const essence = Essence.new();

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Position, Player);

      const num = 100;

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
      }

      const query = Query.new(Position);
      Essence.registerQuery(essence, query);

      expect(query.archetypes.length).toBe(2);
      expect(query.archetypes.some((arch) => arch.entities.length === num)).toBe(true);
    });
    it('should get entities 1', () => {
      const essence = Essence.new();

      const query = Query.new(Position);
      Essence.registerQuery(essence, query);
      expect(query.archetypes.length).toBe(0);

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Position, Player);

      const num = 100;

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
      }

      expect(query.archetypes.length).toBe(2);
      expect(query.archetypes.some((arch) => arch.entities.length === num)).toBe(true);
    });
    it('should get entities 2', () => {
      const essence = Essence.new();

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Position, Player);

      const query = Query.new(Position);
      Essence.registerQuery(essence, query);
      expect(query.archetypes.length).toBe(2);

      Essence.createArchetype(essence, Position, Speed);

      expect(query.archetypes.length).toBe(3);

      const num = 100;

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
      }

      expect(query.archetypes.length).toBe(3);
      expect(query.archetypes.some((arch) => arch.entities.length === num)).toBe(true);
    });
  });
  describe('component', () => {
    it('should change', () => {
      const essence = Essence.new();

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Speed);

      const query = Query.new(Position, Speed);
      Essence.registerQuery(essence, query);

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);

        expect(archetype.entities.length).toBe(0);

        for (let i = 0; i < archetype.entities.length; i++) {
          position[i].x += 1;
          position[i].y += 1;

          speed[i].value += 1;
        }
      }

      const num = 100;

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
      }

      expect(query.archetypes.length).toBe(0);

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
        Essence.setComponent(essence, entity, Speed, { value: 5 });
      }

      expect(query.archetypes.length).toBe(1);

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);

        expect(archetype.entities.length).toBe(num);

        for (let i = 0; i < archetype.entities.length; i++) {
          position[i].x += 1;
          position[i].y += 1;

          speed[i].value += 1;
        }
      }

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);

        for (let i = 0; i < archetype.entities.length; i++) {
          expect(position[i].x).toBe(11);
          expect(position[i].y).toBe(21);

          expect(speed[i].value).toBe(6);
        }
      }
    });
    it('should change by setComponent', () => {
      const essence = Essence.new();

      const entity = Essence.spawnEntity(essence);
      Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });

      const position = Essence.componentByEntity(essence, entity, Position);
      if (!position) {
        throw new Error('Position is not found');
      }

      expect(position).toEqual({ x: 10, y: 20 });

      Essence.setComponent(essence, entity, Position, { x: 3, y: 5 });

      const position2 = Essence.componentByEntity(essence, entity, Position);
      if (!position2) {
        throw new Error('Position is not found');
      }
      expect(position2).toEqual({ x: 3, y: 5 });
    });
    it('should chang 1e', () => {
      const essence = Essence.new();

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Speed);
      Essence.createArchetype(essence, Comments);

      const query = Query.new(Position, Speed, Comments);
      Essence.registerQuery(essence, query);

      const num = 100;

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
        Essence.setComponent(essence, entity, Speed, { value: 5 });
        Essence.setComponent(essence, entity, Comments, { value: ['hello'] });
      }

      expect(query.archetypes.length).toBe(1);

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);
        const comments = Essence.table(archetype, Comments);

        expect(archetype.entities.length).toBe(num);

        for (let i = 0; i < archetype.entities.length; i++) {
          position[i].x += 1;
          position[i].y += 1;

          speed[i].value += 1;

          comments[i].value.push('essence');
        }
      }

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);
        const comments = Essence.table(archetype, Comments);

        for (let i = 0; i < archetype.entities.length; i++) {
          expect(position[i].x).toBe(11);
          expect(position[i].y).toBe(21);

          expect(speed[i].value).toBe(6);

          expect(comments[i].value).toEqual(['hello', 'essence']);
        }
      }
    });
    it('should change 2', () => {
      const essence = Essence.new();

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Speed);
      Essence.createArchetype(essence, NamedTags);

      const query = Query.new(Position, Speed, NamedTags);
      Essence.registerQuery(essence, query);

      const num = 100;

      for (let i = 0; i < num; i++) {
        const entity = Essence.spawnEntity(essence);
        Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
        Essence.setComponent(essence, entity, Speed, { value: 5 });
        Essence.setComponent(essence, entity, NamedTags, { value: [['hello']] });
      }

      expect(query.archetypes.length).toBe(1);

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);
        const comments = Essence.table(archetype, NamedTags);

        expect(archetype.entities.length).toBe(num);

        for (let i = 0; i < archetype.entities.length; i++) {
          position[i].x += 1;
          position[i].y += 1;

          speed[i].value += 1;

          comments[i].value.push(['essence']);
        }
      }

      for (const archetype of query.archetypes) {
        const position = Essence.table(archetype, Position);
        const speed = Essence.table(archetype, Speed);
        const comments = Essence.table(archetype, NamedTags);

        for (let i = 0; i < archetype.entities.length; i++) {
          expect(position[i].x).toBe(11);
          expect(position[i].y).toBe(21);

          expect(speed[i].value).toBe(6);

          expect(comments[i].value).toEqual([['hello'], ['essence']]);
        }
      }
    });
  });
  describe('step', () => {
    it('should iterate', () => {
      const essence = Essence.new();

      Essence.createArchetype(essence, Position);
      Essence.createArchetype(essence, Speed);
      Essence.createArchetype(essence, NamedTags);

      const UpdateHandler = (essence: Essence) => {
        const query = Query.new(Position, Speed, NamedTags);
        Essence.registerQuery(essence, query);
        const num = 100;
        let firstCall = true;

        return ({ essence }: Context) => {
          for (let i = 0; i < num; i++) {
            const entity = Essence.spawnEntity(essence);
            Essence.setComponent(essence, entity, Position, { x: 10, y: 20 });
            Essence.setComponent(essence, entity, Speed, { value: 5 });
            Essence.setComponent(essence, entity, NamedTags, { value: [['hello']] });
          }

          expect(query.archetypes.length).toBe(firstCall ? 0 : 1);

          for (const archetype of query.archetypes) {
            const position = Essence.table(archetype, Position);
            const speed = Essence.table(archetype, Speed);
            const comments = Essence.table(archetype, NamedTags);

            expect(archetype.entities.length).toBe(num);

            for (let i = 0; i < archetype.entities.length; i++) {
              position[i].x += 1;
              position[i].y += 1;

              speed[i].value += 1;

              comments[i].value.push(['essence']);
            }
          }

          firstCall = false;
        };
      };

      const CheckUpdateHandler = (essence: Essence) => {
        const query = Query.new(Position, Speed, NamedTags);
        Essence.registerQuery(essence, query);
        let firstCall = true;

        return ({ essence }: Context) => {
          expect(query.archetypes.length).toBe(firstCall ? 0 : 1);

          for (const archetype of query.archetypes) {
            const position = Essence.table(archetype, Position);
            const speed = Essence.table(archetype, Speed);
            const comments = Essence.table(archetype, NamedTags);

            for (let i = 0; i < archetype.entities.length; i++) {
              expect(position[i].x).toBe(11);
              expect(position[i].y).toBe(21);

              expect(speed[i].value).toBe(6);

              expect(comments[i].value).toEqual([['hello'], ['essence']]);
            }
          }

          firstCall = false;
        };
      };

      Essence.registerSystem(essence, UpdateHandler(essence), {
        stage: 'update',
      });
      Essence.registerSystem(essence, CheckUpdateHandler(essence), {
        stage: 'postUpdate',
      });

      expect(essence.deferredOperations.deferred).toBe(false);
      expect(essence.deferredOperations.operations.length).toBe(0);
      expect(essence.deferredOperations.killed.size).toBe(0);

      Essence.step(essence);

      expect(essence.deferredOperations.deferred).toBe(false);
      expect(essence.deferredOperations.operations.length).toBe(0);
      expect(essence.deferredOperations.killed.size).toBe(0);

      Essence.step(essence);

      expect(essence.deferredOperations.deferred).toBe(false);
      expect(essence.deferredOperations.operations.length).toBe(0);
      expect(essence.deferredOperations.killed.size).toBe(0);
    });
  });
});
