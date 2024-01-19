import { TreeNode } from "primereact/treenode";

type Scope = {
  readonly user: { value: string };
  readonly treeSource: TreeNode[];
};

export default (scope: Scope) => ({
  demoButtonClick: (e: React.MouseEvent) => {
    console.log("Woohoo", scope.user.value);
    scope.user.value = "World";
  },
  treeSourceCreateTreeData: async (): Promise<TreeNode[]> => {
    return [
      {
        label: "Splitter",
        children: [
          {
            label: "first",
            children: [{ label: "Tree" }, { label: "Button" }],
          },
          { label: "second" },
        ],
      },
    ];
  },
});
