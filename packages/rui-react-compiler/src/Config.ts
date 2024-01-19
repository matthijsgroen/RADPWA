export type PropertyType = StringProperty | NumberProperty;

type StringProperty = {
  type: "string";
};
type NumberProperty = {
  type: "number";
  min?: number;
  max?: number;
};

export type ComponentDefinition = {
  name: string;
  category: string;
  dependencies: string[];
  properties?: Record<string, PropertyType>;
  childContainers?: string[];
  allowChildren?: boolean;
};

export type Config = {
  components: ComponentDefinition[];
};
