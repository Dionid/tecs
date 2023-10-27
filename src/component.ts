export type ComponentSchemaId = number;

export enum ComponentSchemaKind {
  SoA,
  Tag,
}

export type ComponentSchemaSoA<Data extends Record<string, any[]> = Record<string, any[]>> = {
  id: ComponentSchemaId;
  kind: ComponentSchemaKind.SoA;
  shape: ReadonlyArray<keyof Data>;
  default: Data;
  defaultValues: {
    [K in keyof Data]: Data[K][number];
  };
};

export type ComponentSchemaTag = {
  id: ComponentSchemaId;
  kind: ComponentSchemaKind.Tag;
};

export type ComponentSchema<Data extends Record<string, any[]> | undefined = Record<string, any[]> | undefined> =
  Data extends Record<string, any[]> ? ComponentSchemaSoA<Data> : ComponentSchemaTag;

export type DataFromComponentSchemas<CSL extends ReadonlyArray<ComponentSchema>> = {
  [K in keyof CSL]: CSL[K] extends ComponentSchema
    ? CSL[K] extends ComponentSchemaSoA<any>
      ? CSL[K]['default']
      : undefined
    : never;
};

export type DataValuesFromComponentSchemas<CSL extends ReadonlyArray<ComponentSchema>> = {
  [K in keyof CSL]: CSL[K] extends ComponentSchema
    ? CSL[K] extends ComponentSchemaSoA<any>
      ? CSL[K]['defaultValues']
      : undefined
    : never;
};

// # Component

export type Component<Data extends Record<string, any[]> | undefined = Record<string, any[]> | undefined> = {
  schema: ComponentSchema<Data>;
  data: Data;
};

export type ComponentFromSchema<C extends ComponentSchema> = C extends ComponentSchemaSoA<infer Data>
  ? Component<Data>
  : C extends ComponentSchemaTag
  ? Component<undefined>
  : never;

export type ComponentListFromSchemaList<CSL extends ReadonlyArray<ComponentSchema>> = {
  [K in keyof CSL]: ComponentFromSchema<CSL[K]>;
};
