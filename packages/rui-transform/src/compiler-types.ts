import ts from "typescript";

export type Resolver = (module: string) => string;

export type RuiDataComponent = {
  id: string;
  component: string;

  props?: Record<string, any>;
  events?: Record<string, any>;
};

export type RuiVisualComponent = {
  id: string;
  component: string;

  props?: Record<string, any>;
  events?: Record<string, any>;
  childContainers?: Record<string, RuiVisualComponent[]>;
};

export type RuiJSONFormat = {
  componentLibrary: string;
  eventHandlers: string;
  id: string;
  components: RuiDataComponent[];
  composition: RuiVisualComponent[];
};

export type ComponentDependency = {
  module: string;
  namedExport?: string;
  isDefaultExport: boolean;
  aliasName: string;
};

export type PropertyInfo = Record<
  string,
  { type: ts.TypeNode | undefined; typeAsString: string }
>;

export type EventInfo = Record<
  string,
  {
    type: ts.TypeNode | undefined;
    returnTypeAsString: string;
    parameters: [name: string, typeAsString: string][];
  }
>;

export type ProductionInfo = {
  type: ts.TypeNode | undefined;
  typeAsString: string;
};

export type ComponentMetaInformation = {
  componentName: string;
  dependencies: ComponentDependency[];
  isVisual: boolean;
  properties: PropertyInfo;
  produces?: ProductionInfo;
  events: EventInfo;
};
