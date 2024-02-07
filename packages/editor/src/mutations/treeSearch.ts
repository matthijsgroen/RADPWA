import { RuiDataComponent, RuiVisualComponent } from "@rui/transform";

export const treeSearch = <T extends RuiDataComponent | RuiVisualComponent>(
  id: string,
  items: T[],
): T | undefined => {
  for (const i of items) {
    if (i.id === id) return i;
    if (i.childContainers) {
      for (const containerName in i.childContainers) {
        const result = treeSearch<T>(
          id,
          i.childContainers[containerName] as T[],
        );
        if (result) {
          return result;
        }
      }
    }
  }
};
