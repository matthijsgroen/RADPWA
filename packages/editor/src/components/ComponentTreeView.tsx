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
  vcl: ComponentLibraryMetaInformation;
  viewTreeState: Record<string, boolean>;
  setViewTreeState: (newState: Record<string, boolean>) => void;
  selectedComponent: (e: string | null) => void;
  onAddNodeClick?: (
    parent: null | string,
    containerName: string,
    nodeType: "data" | "visual",
  ) => void;
  onRemoveNodeClick?: (nodeKey: string, nodeType: "data" | "visual") => void;
};

const TreeView: React.FC<TreeViewProps> = ({
  ruiComponents,
  vcl,
  viewTreeState,
  setViewTreeState,
  selectedComponent,
  onAddNodeClick,
  onRemoveNodeClick,
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

      children: transformToTreeNode(ruiComponents.components, vcl),
    },
    {
      key: "view-root",
      label: "View",
      icon: PrimeIcons.PALETTE,
      data: null,
      type: "visual",

      isContainer: true,
      containerParent: null,

      children: transformToTreeNode(ruiComponents.composition, vcl),
    },
  ];

  return (
    <>
      <Tree
        value={components}
        selectionMode="single"
        onSelect={(e) => selectedComponent(e.node.key ? `${e.node.key}` : null)}
        expandedKeys={viewTreeState}
        onToggle={(event) => setViewTreeState(event.value)}
        nodeTemplate={(node) => {
          const componentTreeNode = node as ComponentTreeNode;

          return (
            <div className="flex items-center justify-between w-full">
              <div>{componentTreeNode.label}</div>
              <div>
                {componentTreeNode.isContainer ? (
                  <Button
                    icon="pi pi-plus"
                    rounded
                    text
                    aria-label="Add"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!vcl) return;
                      onAddNodeClick?.(
                        componentTreeNode.containerParent ?? null,
                        componentTreeNode.key,
                        componentTreeNode.type,
                      );
                    }}
                  />
                ) : (
                  <Button
                    icon="pi pi-times"
                    severity="danger"
                    rounded
                    text
                    aria-label="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!vcl) return;
                      onRemoveNodeClick?.(
                        componentTreeNode.key,
                        componentTreeNode.type,
                      );
                    }}
                  />
                )}
              </div>
            </div>
          );
        }}
      />
    </>
  );
};

export default TreeView;
