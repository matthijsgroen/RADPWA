import {
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { produce } from "immer";
import { createName } from "~src/utils/createName";
import { treeSearch } from "./treeSearch";
import { ComponentTreeNode } from "~src/components/ComponentTreeView";

export const addComponentToStructure = (
  componentType: string,
  parent: string | null,
  containerName: string | null,
  nodeType: "data" | "visual",
) =>
  produce<RuiJSONFormat>((draft) => {
    const collectNames = (
      items: RuiDataComponent[] | RuiVisualComponent[],
    ): string[] =>
      items.flatMap((i) => {
        const result: string[] = [i.id];
        if (i.childContainers) {
          result.push(
            ...Object.entries(i.childContainers).flatMap(
              ([name, container]) => {
                return collectNames(container);
              },
            ),
          );
        }
        return result;
      });

    const names = collectNames(draft.components).concat(
      collectNames(draft.composition),
    );

    const id = createName(
      componentType[0].toLowerCase() + componentType.slice(1),
      names,
    );

    if (nodeType === "data") {
      const root = draft.components;
      if (parent === null) {
        root.push({
          id,
          component: componentType,
          type: nodeType,
          childContainers: {},
        });
      } else {
        if (!containerName) return;
        const parentComponent = treeSearch(parent, root);
        if (!parentComponent) return;
        parentComponent.childContainers ??= {};
        parentComponent.childContainers[containerName] ??= [];
        parentComponent.childContainers[containerName].push({
          id,
          component: componentType,
          type: nodeType,
          childContainers: {},
        });
      }
    } else {
      const root = draft.composition;
      if (parent === null) {
        root.push({
          id,
          component: componentType,
          type: nodeType,
          childContainers: {},
        });
      } else {
        if (!containerName) return;
        const parentComponent = treeSearch(parent, root);
        if (!parentComponent) return;
        parentComponent.childContainers ??= {};
        parentComponent.childContainers[containerName] ??= [];
        parentComponent.childContainers[containerName].push({
          id,
          component: componentType,
          type: nodeType,
          childContainers: {},
        });
      }
    }
  });

export const removeComponentFromStructure = (
  componentKey: string,
  nodeType: "data" | "visual",
) =>
  produce<RuiJSONFormat>((draft) => {
    const remove = (items: RuiDataComponent[] | RuiVisualComponent[]): void => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === componentKey) {
          items.splice(i, 1);
          return;
        }
        if (items[i].childContainers) {
          for (const containerName in items[i].childContainers) {
            remove(items[i].childContainers![containerName]);
          }
        }
      }
    };

    if (nodeType === "data") {
      remove(draft.components);
    } else {
      remove(draft.composition);
    }
  });

export const rearrangeComponents = (
  dragNode: ComponentTreeNode,
  dropNode: ComponentTreeNode,
  dropIndex: number,
) =>
  produce<RuiJSONFormat>((draft) => {
    const findAndRemove = (
      items: RuiDataComponent[] | RuiVisualComponent[],
      id: string,
    ): RuiDataComponent | RuiVisualComponent | undefined => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          const [removed] = items.splice(i, 1);
          return removed;
        }
        if (items[i].childContainers) {
          for (const containerName in items[i].childContainers) {
            const result = findAndRemove(
              items[i].childContainers![containerName],
              id,
            );
            if (result) {
              return result;
            }
          }
        }
      }
    };

    const insertAt = (
      items: RuiDataComponent[] | RuiVisualComponent[],
      node: RuiDataComponent | RuiVisualComponent,
      index: number,
    ) => {
      // Make typescript happy
      if (node.type === "data") {
        items.splice(index, 0, node);
      } else {
        items.splice(index, 0, node);
      }
    };

    const collection =
      dragNode.type === "data" ? draft.components : draft.composition;

    // Find and remove the dragged node
    const nodeToMove = findAndRemove(collection, dragNode.key);
    if (!nodeToMove) {
      console.error("Dragged node not found");
      return;
    }

    if (dropNode.isContainer && dropNode.containerParent) {
      const parent = collection.find((c) => c.id === dropNode.containerParent);
      if (!parent) return;
      parent.childContainers ??= {};
      parent.childContainers[dropNode.key] ??= [];
      insertAt(parent.childContainers[dropNode.key], nodeToMove, dropIndex);
    } else {
      // Insert at data/view level
      insertAt(collection, nodeToMove, dropIndex);
    }
  });
