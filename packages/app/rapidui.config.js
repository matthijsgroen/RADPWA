/** @type {import('@rui/rui-react').Config} */
module.exports = {
  componentLibraries: [],
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
        dataSource: { type: "TTreeDataSource" },
      },
    },
    {
      name: "Pane",
      category: "Panel",
      dependencies: ["~src/components/Pane:Pane"],
      properties: {
        direction: { type: "string" },
      },
      allowChildren: true,
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
          ${hasChildren("center") ? `start={<>${toChildrenString("center")}</>}` : ""}
          ${hasChildren("end") ? `start={<>${toChildrenString("end")}</>}` : ""}
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
        firstMinSize: { type: "number", min: 0, max: 100 },
        secondMinSize: { type: "number", min: 0, max: 100 },
      },
      childContainers: ["first", "second"],
      transform: (
        { dependencies, properties },
        { toChildrenString, pickAndRemap, flattenProps },
      ) => {
        return `<${dependencies[0]}>
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
      name: "Text",
      category: "TextBlock",
      dependencies: [],
      componentName: "p",
      properties: {},
      allowChildren: true,
    },
    {
      name: "Button",
      category: "Button",
      dependencies: ["primereact/button:Button"],
      properties: {
        label: { type: "string" },
      },
      events: {
        onClick: { returnType: "void", parameters: ["React.MouseEvent"] },
      },
    },
    {
      name: "ComponentState",
      category: "State",
      dependencies: [
        "~src/components/componentState:useComponentState:useComponentState",
      ],
      properties: {
        stateModel: { type: "editor" },
        value: { type: "editor" },
      },
      produces: (config) => config.properties.stateModel.value,
      hidden: true,
      // type ?
      transform: (config) =>
        `const ${config.id} = ${config.dependencies[0]}<${config.properties.stateModel}>(${config.properties.value});`,
    },
  ],
};
