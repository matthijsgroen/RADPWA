import {
  ComponentMetaInformation,
  RuiDataComponent,
  RuiVisualComponent,
} from "@rui/transform";
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
): ComponentTreeNode[] => {
  return components.map((component) => {
    let treeNode: ComponentTreeNode = {
      key: component.id,
      label: `${component.id} (${component.component})`,
      data: component,
    };

    if (component.childContainers) {
      treeNode.children = Object.entries(
        component.childContainers,
      ).map<ComponentTreeNode>(([name, container]) => {
        return {
          key: name,
          label: name,
          data: null,
          children: transformToTreeNode(container),
        };
      });
    }

    return treeNode;
  });
};

// Recursively update the component tree by finding the component with the
// matching id and updating the component properties
export const updateNestedItemByKey = (
  obj: Record<string, any>,
  keyToUpdate: string,
  newValue: string,
) => {
  let updated = false;

  const updateItem = (item: Record<string, any>, key: string) => {
    if (item.hasOwnProperty(key)) {
      item[key] = newValue; // Update the value
      updated = true;
      return true; // Stops the search after updating
    }

    if (typeof item === "object" && item !== null) {
      for (const key of Object.keys(item)) {
        if (updateItem(item[key], keyToUpdate)) {
          break; // Breaks the loop if the key is found and updated in a nested object
        }
      }
    }
  };

  updateItem(obj, keyToUpdate);
  return updated;
};
