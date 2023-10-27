import { Archetype, ComponentSchema, ComponentSchemaKind, ComponentSchemaTag, World } from './index';

describe('aws', () => {
  it('should be true', () => {
    const world = World.new();

    const A: ComponentSchemaTag = {
      id: World.registerComponentSchemaId(world),
      kind: ComponentSchemaKind.Tag,
    };

    const B: ComponentSchemaTag = {
      id: World.registerComponentSchemaId(world),
      kind: ComponentSchemaKind.Tag,
    };

    const aPrefab = World.prefabricate(world, [A] as const);
    const bPrefab = World.prefabricate(world, [B] as const);

    const systemA = (world: World) => {
      const aArchetypes = World.registerQuery(world, [A] as const);

      return (world: World) => {
        for (let i = 0; i < aArchetypes.length; i++) {
          const [archetype] = aArchetypes[i];

          for (let j = archetype.entities.length - 1; j >= 0; j--) {
            World.spawnEntity(world, bPrefab);
          }
        }
      };
    };

    const systemB = (world: World) => {
      const bArchetypes = World.registerQuery(world, [B] as const);

      return (world: World) => {
        for (let i = 0; i < bArchetypes.length; i++) {
          const [archetype] = bArchetypes[i];

          for (let j = archetype.entities.length - 1; j >= 0; j--) {
            const entity = archetype.entities[j];
            World.destroyEntity(world, entity);
          }
        }
      };
    };

    for (let i = 0; i < 100; i++) {
      World.spawnEntity(world, aPrefab);
    }

    const systems = [systemA(world), systemB(world)];

    World.step(world, systems);

    expect(true).toBe(true);
  });

  it('should be true', () => {
    const world = World.new();

    const Position: ComponentSchema<{ x: number[]; y: number[] }> = {
      id: World.registerComponentSchemaId(world),
      kind: ComponentSchemaKind.SoA,
      shape: ['x', 'y'],
      defaultValues: {
        x: 0,
        y: 0,
      },
      default: {
        x: [],
        y: [],
      },
    };

    const Size: ComponentSchema<{ width: number[] }> = {
      id: World.registerComponentSchemaId(world),
      kind: ComponentSchemaKind.SoA,
      shape: ['width'],
      defaultValues: {
        width: 0,
      },
      default: {
        width: [],
      },
    };

    const Selectable: ComponentSchemaTag = {
      id: World.registerComponentSchemaId(world),
      kind: ComponentSchemaKind.Tag,
    };

    const mainPrefab = World.prefabricate(world, [Position, Size, Selectable] as const);

    const systemA = (world: World) => {
      const archetypes = World.registerQuery(world, [Position, Size, Selectable] as const);

      return (world: World) => {
        for (let i = 0; i < archetypes.length; i++) {
          const [archetype, [position, size]] = archetypes[i];

          for (let j = archetype.entities.length - 1; j >= 0; j--) {
            position.x[j] += 1;
            position.y[j] += 1;
            size.width[j] *= 2;
          }
        }
      };
    };

    for (let i = 0; i < 100; i++) {
      // # Simple
      World.spawnEntity(world);
    }

    for (let i = 0; i < 100; i++) {
      // # With prefab
      World.spawnEntity(world, mainPrefab);
    }

    for (let i = 0; i < 100; i++) {
      // # With prefab and initial values
      World.spawnEntity(world, mainPrefab, [{ x: 10, y: 10 }, { width: 100 }, undefined]);
    }

    for (let i = 0; i < 100; i++) {
      // # Archetype can be grabbed from result (type-safe)
      const [entity, arch] = World.spawnEntity(world, mainPrefab, [{ x: 10, y: 10 }, { width: 100 }, undefined]);
      const size = Archetype.getComponent(arch, Size);
      size.data.width[entity] = 1;
    }

    for (let i = 0; i < 100; i++) {
      // # Or you can find archetype by entity (not type-safe)
      const [entity] = World.spawnEntity(world, mainPrefab, [{ x: 10, y: 10 }, { width: 100 }, undefined]);
      const arch = World.getEntityArchetype(world, entity);
      const size = Archetype.getComponent(arch, Size);
      size.data.width[entity] = 1;
    }

    const systems = [systemA(world)];

    World.step(world, systems);

    expect(true).toBe(true);
  });
});
