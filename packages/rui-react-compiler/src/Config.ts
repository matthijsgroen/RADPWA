export type PropertyType = {
  type: string;
  editorType?: EditorType;
};

type EditorType =
  | StringEditor
  | NumberEditor
  | EnumEditor
  | BooleanEditor
  | CustomEditor
  | TypeSelectionEditor;

type StringEditor = {
  type: "string";
  minLength: number;
  maxLength: number;
};

type NumberEditor = {
  type: "number";
  min: number;
  max: number;
};

type EnumEditor = {
  type: "enum";
  options: string[];
};

type BooleanEditor = {
  type: "boolean";
};

type CustomEditor = {
  type: "custom";
};

type TypeSelectionEditor = {
  type: "typeSelection";
};

export type FunctionSignature = {
  type: "functionReference";
  returnType: string;
  parameters: [name: string, type: string][];
};

export type ComponentModel = {
  id: string;
  dependencies: string[];
  properties: Record<string, string>;
  events: Record<string, string>;
};

type RenderHelpers = {
  toChildrenString: (containerName: string) => string;
  hasChildren: (containerName: string) => boolean;
  pickAndRemap: (
    properties: Record<string, string>,
    remap: Record<string, string>,
  ) => Record<string, string>;
  flattenProps: (properties: Record<string, string>) => string;
};

export type ComponentDefinition = DataComponent | VisualComponent;

export type ComponentBase = {
  name: string;
  componentName?: string;
  category: string;
  dependencies: string[];
  properties?: Record<string, PropertyType>;
  events?: Record<string, FunctionSignature>;
};

export type DataComponent = ComponentBase & {
  produces?: (model: ComponentModel) => string;
  hidden: true;
  transform: (model: ComponentModel) => string;
};

export type VisualComponent = ComponentBase & {
  childContainers?: (string | { name: string; childTypeFilter?: string })[];
  allowChildren?: boolean | { childTypeFilter: string };
  hidden?: false;
  transform?: (model: ComponentModel, helpers: RenderHelpers) => string;
};

export type Config = {
  components: ComponentDefinition[];
};