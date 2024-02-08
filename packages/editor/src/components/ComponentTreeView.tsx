import {
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { PrimeIcons } from "primereact/api";
import { Tree } from "primereact/tree";
import { TreeNode } from "primereact/treenode";
import { IconType } from "primereact/utils";
import React from "react";
import { transformToTreeNode } from "~src/utils";

export type ComponentTreeNode = {
  key: string;
  label: string;
  icon?: IconType<TreeNode>;
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
  const components: ComponentTreeNode[] = [
    {
      key: "data-root",
      label: "Data",
      icon: PrimeIcons.DATABASE,
      data: null,
      children: transformToTreeNode(ruiComponents.components),
    },
    {
      key: "view-root",
      label: "View",
      icon: PrimeIcons.PALETTE,
      data: null,
      children: transformToTreeNode(ruiComponents.composition),
    },
  ];

  return (
    <Tree
      value={components}
      selectionMode="single"
      onSelect={(e) => selectedComponent(e.node.key ? `${e.node.key}` : null)}
    />
  );
}
