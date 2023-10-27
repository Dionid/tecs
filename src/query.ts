import { Archetype } from './archetype';
import { BitSet } from './bit-set';
import { ComponentSchema, ComponentSchemaId, DataFromComponentSchemas } from './component';

export type Query<CSL extends ReadonlyArray<ComponentSchema>> = {
  result: [Archetype<CSL>, DataFromComponentSchemas<CSL>][];
  mask: BitSet;
  tryAdd: (archetype: Archetype) => boolean;
};

export const Query = {
  new: <CSL extends ReadonlyArray<ComponentSchema>>(components: CSL): Query<CSL> => {
    const result: [Archetype<CSL>, DataFromComponentSchemas<CSL>][] = [];
    const mask = Query.makeMask(components.map((c) => c.id));

    return {
      result,
      mask,
      tryAdd: (archetype: Archetype<any>) => {
        if (!BitSet.contains(archetype.mask, mask)) {
          return false;
        }

        const resultComponents = [];

        for (let i = 0; i < components.length; i++) {
          const componentId = components[i].id;
          resultComponents.push(archetype.components[componentId].data);
        }

        result.push([archetype, resultComponents as DataFromComponentSchemas<CSL>]);

        return true;
      },
    };
  },
  makeMask: (componentIds: ComponentSchemaId[]): BitSet => {
    const max = Math.max(...componentIds);
    const mask = BitSet.new(Math.ceil(max / 32));
    for (let i = 0; i < componentIds.length; i++) {
      BitSet.or(mask, componentIds[i]!);
    }
    return mask;
  },
};
