import { RuiVisualComponent } from "@rui/transform";
import { ComponentTreeNode } from "~src/components/ComponentTreeView";

// Both the component props and events are processed in the same way but kept as
// separate functions for future changes to the events and props model
export const processComponentProps = (
  attributes: Record<string, any> | Record<string, any>[] | undefined,
) => {
  if (!attributes) return [];

  if (!Array.isArray(attributes)) {
    const [name, value] = Object.entries(attributes)[0];
    return [
      {
        name,
        type: typeof value,
        value,
      },
    ];
  }

  return attributes.map((attrObj) => {
    const [name, value] = Object.entries(attrObj)[0];
    return {
      name,
      type: typeof value,
      value,
    };
  });
};

export const processComponentEvents = (
  attributes: Record<string, any> | Record<string, any>[] | undefined,
) => {
  if (!attributes) return [];

  if (!Array.isArray(attributes)) {
    const [name, value] = Object.entries(attributes)[0];
    return [
      {
        name,
        type: typeof value,
        value,
      },
    ];
  }

  return attributes.map((attrObj) => {
    const [name, value] = Object.entries(attrObj)[0];
    return {
      name,
      type: typeof value,
      value,
    };
  });
};

// Recursively transform the component tree to a tree node structure
// that can be used by the PrimeReact TreeView component
export const transformToTreeNode = (components: RuiVisualComponent[]) => {
  return components.map((component) => {
    let treeNode: ComponentTreeNode = {
      key: component.id,
      label: component.component,
      data: component,
    };

    if (component.childContainers && component.childContainers.children) {
      treeNode.children = transformToTreeNode(
        component.childContainers.children,
      );
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
