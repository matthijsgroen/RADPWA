import ts from "typescript";

export type RuiDataComponent = {
  id: string;
  type: string;
  component: string;
  propsAsState?: string[];
  props?: Record<string, any>;
  events?: Record<string, any>;
  childContainers?: Record<string, RuiDataComponent[]>;
};

export type RuiVisualComponent = {
  id: string;
  type: string;
  component: string;
  props?: Record<string, any>;
  events?: Record<string, any>;
  propsAsState?: string[];
  childContainers?: Record<string, RuiVisualComponent[]>;
};

export type RuiDependency = {
  module: string;
  name: string;
  importName?: string;
  namedImport: boolean;
};

export type RuiTypeDeclaration = {
  type: string;
  optional: boolean;
  dependencies: RuiDependency[];
};

export type RuiJSONFormat = {
  componentLibrary: string;
  eventHandlers: string;
  id: string;
  interface: Record<string, RuiTypeDeclaration>;
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
  { type?: ts.TypeNode; typeAsString: string }
>;

export type EventInfo = Record<
  string,
  {
    type?: ts.TypeNode;
    returnTypeAsString: string;
    parameters: [name: string, typeAsString: string][];
  }
>;

export type ProductionInfo = {
  type?: ts.TypeNode;
  typeAsString: string;
};

export type ChildContainer = {
  type?: ts.TypeNode;
  typeAsString: string;
  // could be extended with 'limits'
};

export type ChildContainers = Record<string, ChildContainer>;

export type ComponentMetaInformation = {
  componentName: string;
  dependencies: ComponentDependency[];
  isVisual: boolean;
  properties: PropertyInfo;
  produces?: ProductionInfo;
  events: EventInfo;
  childContainers: ChildContainers;
};

export type ComponentLibraryMetaInformation = Record<
  string,
  ComponentMetaInformation
>;
