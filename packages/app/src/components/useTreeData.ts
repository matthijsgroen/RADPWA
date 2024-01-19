import { TreeNode } from "primereact/treenode";
import { useEffect, useState } from "react";

export const useTreeData = ({
  getTreeData,
}: {
  getTreeData: () => Promise<TreeNode[]>;
}): TreeNode[] => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  useEffect(() => {
    getTreeData().then((result) => {
      setTreeData(result);
    });
  }, []);

  return treeData;
};
