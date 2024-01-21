import { Config } from "@rui/react-compiler";

const components: Config = {
  components: [
    {
      name: "Panel",
      category: "Panel",
      dependencies: ["primereact/panel:Panel"],
      properties: {
        header: { type: "string" },
      },
      allowChildren: true,
    },
    {
      name: "Tree",
      category: "Data",
      dependencies: ["primereact/tree:Tree"],
      properties: {
        value: { type: "TreeNode[]" },
      },
    },
    {
      name: "Toolbar",
      componentName: "Toolbar",
      category: "Containers",
      dependencies: ["primereact/toolbar:Toolbar"],
      childContainers: ["start", "center", "end"],
      transform: ({ dependencies }, { hasChildren, toChildrenString }) =>
        `<${dependencies[0]} 
          ${hasChildren("start") ? `start={<>${toChildrenString("start")}</>}` : ""}
          ${hasChildren("center") ? `center={<>${toChildrenString("center")}</>}` : ""}
          ${hasChildren("end") ? `end={<>${toChildrenString("end")}</>}` : ""}
        />
        `,
    },
    {
      name: "SplitterPanel",
      componentName: "Splitter",
      category: "Panel",
      dependencies: [
        "primereact/splitter:Splitter",
        "primereact/splitter:SplitterPanel:SplitterPanel",
      ],
      properties: {
        layout: {
          type: "string",
          editorType: { type: "enum", options: ["horizontal", "vertical"] },
        },
        firstMinSize: {
          type: "number",
          editorType: { type: "number", min: 0, max: 100 },
        },
        secondMinSize: {
          type: "number",
          editorType: { type: "number", min: 0, max: 100 },
        },
      },
      childContainers: ["first", "second"],
      transform: (
        { dependencies, properties },
        { toChildrenString, pickAndRemap, flattenProps },
      ) => {
        return `<${dependencies[0]} ${flattenProps(pickAndRemap(properties, { layout: "layout" }))}>
          <${dependencies[1]} ${flattenProps(pickAndRemap(properties, { firstMinSize: "minSize" }))}>
              ${toChildrenString("first")}
          </${dependencies[1]}>
          <${dependencies[1]} ${flattenProps(pickAndRemap(properties, { secondMinSize: "minSize" }))}>
            ${toChildrenString("second")}
          </${dependencies[1]}>
        </${dependencies[0]}>`;
      },
    },
    {
      name: "Button",
      category: "Button",
      dependencies: ["primereact/button:Button"],
      properties: {
        label: { type: "string" },
      },
      events: {
        onClick: {
          type: "functionReference",
          returnType: "void",
          parameters: [["event", "React.MouseEvent"]],
        },
      },
    },
    {
      name: "StaticTreeData",
      category: "Data",
      dependencies: ["primereact/treenode:TreeNode"],
      properties: {
        value: { type: "editor" },
      },
      produces: () => "TreeNode[]",
      hidden: true,
      transform: (config) =>
        `const ${config.id}: TreeNode[] = ${config.properties.value};`,
    },
    {
      name: "TreeDataProducer",
      category: "Data",
      dependencies: [
        "~src/components/useTreeData:useTreeData:useTreeData",
        "primereact/treenode:TreeNode:TreeNode",
      ],
      events: {
        onCreateTreeData: {
          type: "functionReference",
          returnType: "Promise<TreeNode[]>",
          parameters: [],
        },
      },
      produces: () => "TreeNode[]",
      hidden: true,
      transform: (config) =>
        `const ${config.id}: ${config.dependencies[1]}[] = ${config.dependencies[0]}({ getTreeData: ${config.events.onCreateTreeData} });`,
    },
  ],
};

export default components;
