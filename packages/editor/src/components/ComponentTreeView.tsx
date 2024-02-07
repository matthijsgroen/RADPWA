import {
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { Tree } from "primereact/tree";
import React from "react";
import { transformToTreeNode } from "~src/utils";

export type ComponentTreeNode = {
  key: string;
  label: string;
  data: RuiVisualComponent | RuiDataComponent | null;
  children?: ComponentTreeNode[];
};

type TreeViewProps = {
  ruiComponents: RuiJSONFormat;
  selectedComponent: (e: string | null) => void;
};

export default function TreeView({
  ruiComponents,
  selectedComponent,
}: TreeViewProps) {
  const components: ComponentTreeNode[] = transformToTreeNode(
    ruiComponents.components,
  ).concat(transformToTreeNode(ruiComponents.composition));

  return (
    <Tree
      value={components}
      selectionMode="single"
      onSelect={(e) => selectedComponent(e.node.key ? `${e.node.key}` : null)}
    />
  );
}
