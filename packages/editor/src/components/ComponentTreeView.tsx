import {
  ComponentLibraryMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { PrimeIcons } from "primereact/api";
import { Button } from "primereact/button";
import { Tree } from "primereact/tree";
import { TreeNode } from "primereact/treenode";
import { IconType } from "primereact/utils";
import React from "react";
import { transformToTreeNode } from "~src/utils";

export type ComponentTreeNode = {
  key: string;
  type: "data" | "visual";
  label: string;
  icon?: IconType<TreeNode>;

  isContainer: boolean;
  containerParent?: null | string;

  data: RuiVisualComponent | RuiDataComponent | null;
  children?: ComponentTreeNode[];
};

type TreeViewProps = {
  ruiComponents: RuiJSONFormat;
  componentsStructure?: ComponentLibraryMetaInformation;
  viewTreeState: Record<string, boolean>;
  setVewTreeState: (newState: Record<string, boolean>) => void;
  selectedComponent: (e: string | null) => void;
  onAddNodeClick?: (
    parent: null | string,
    containerName: string,
    nodeType: "data" | "visual",
  ) => void;
};

const TreeView: React.FC<TreeViewProps> = ({
  ruiComponents,
  componentsStructure,
  viewTreeState,
  setVewTreeState,
  selectedComponent,
  onAddNodeClick,
}) => {
  const components: ComponentTreeNode[] = [
    {
      key: "data-root",
      label: "Data",
      icon: PrimeIcons.DATABASE,
      data: null,
      type: "data",

      isContainer: true,
      containerParent: null,

      children: transformToTreeNode(ruiComponents.components),
    },
    {
      key: "view-root",
      label: "View",
      icon: PrimeIcons.PALETTE,
      data: null,
      type: "visual",

      isContainer: true,
      containerParent: null,

      children: transformToTreeNode(ruiComponents.composition),
    },
  ];

  return (
    <>
      <Tree
        value={components}
        selectionMode="single"
        onSelect={(e) => selectedComponent(e.node.key ? `${e.node.key}` : null)}
        expandedKeys={viewTreeState}
        onToggle={(event) => setVewTreeState(event.value)}
        nodeTemplate={(node) => {
          const componentTreeNode = node as ComponentTreeNode;

          return (
            <div className="flex items-center justify-between w-full">
              <div>{componentTreeNode.label}</div>
              {componentTreeNode.children && componentTreeNode.isContainer && (
                <Button
                  icon="pi pi-plus"
                  rounded
                  text
                  aria-label="Add"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!componentsStructure) return;
                    onAddNodeClick?.(
                      componentTreeNode.containerParent ?? null,
                      componentTreeNode.key,
                      componentTreeNode.type,
                    );
                  }}
                />
              )}
            </div>
          );
        }}
      />
    </>
  );
};

export default TreeView;
