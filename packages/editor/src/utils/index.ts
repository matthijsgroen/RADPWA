import {
  ComponentLibraryMetaInformation,
  ComponentMetaInformation,
  RuiDataComponent,
  RuiVisualComponent,
} from "@rui/transform";
import { PrimeIcons } from "primereact/api";
import { ComponentTreeNode } from "~src/components/ComponentTreeView";

export type PropertyItem<TType = unknown> = {
  name: string;
  type: string;
  value: TType;
  exposedAsState: boolean;
};

// Both the component props and events are processed in the same way but kept as
// separate functions for future changes to the events and props model
export const processComponentProps = (
  id: string | undefined,
  attributes: Record<string, any> | undefined,
  propsAsState: string[],
  componentData: ComponentMetaInformation | undefined,
): PropertyItem[] => {
  if (!componentData) return [];
  return [
    ...(id
      ? [
          {
            name: "id",
            type: "string",
            value: id,
            exposedAsState: false,
          },
        ]
      : []),
  ].concat(
    Object.entries(componentData.properties).map(([name, v]) => {
      return {
        name,
        type: v.typeAsString,
        value: attributes ? attributes[name] : undefined,
        exposedAsState: propsAsState.includes(name),
      };
    }),
  );
};

export const processComponentEvents = (
  attributes: Record<string, any> | undefined,
  componentData: ComponentMetaInformation | undefined,
) => {
  if (!componentData) return [];

  return Object.entries(componentData.events).map(([name, v]) => {
    return {
      name,
      type: "function",
      value: attributes ? attributes[name] : undefined,
    };
  });
};

// Recursively transform the component tree to a tree node structure
// that can be used by the PrimeReact TreeView component
export const transformToTreeNode = (
  components: (RuiVisualComponent | RuiDataComponent)[],
  vcl: ComponentLibraryMetaInformation,
): ComponentTreeNode[] => {
  return components.map((component) => {
    const componentInfo = vcl[component.component];
    let treeNode: ComponentTreeNode = {
      key: component.id,
      type: component.type,
      label: `${component.id} (${component.component})`,
      data: component,

      isContainer: false,
    };

    if (Object.keys(componentInfo.childContainers).length > 0) {
      treeNode.children = Object.entries(
        componentInfo.childContainers,
      ).map<ComponentTreeNode>(([name]) => {
        const container = component.childContainers?.[name];
        return {
          key: name,
          type: component.type,
          label: name,
          data: null,
          isContainer: true,
          containerParent: component.id,

          icon: PrimeIcons.FOLDER_OPEN,
          children: container ? transformToTreeNode(container, vcl) : undefined,
        };
      });
    }

    return treeNode;
  });
};

export const isRef = (
  data: PropertyItem,
): data is PropertyItem<{ ref: string }> =>
  data.type.startsWith("ComponentProductRef<");

export const isFunction = (data: PropertyItem): data is PropertyItem<string> =>
  data.type === "function";
