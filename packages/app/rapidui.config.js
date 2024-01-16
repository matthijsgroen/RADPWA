module.exports = {
  projectName: "My Rapid UI",
  componentLibraries: [],
  components: [
    {
      name: "Panel",
      category: "Containers",
      dependencies: ["primereact/panel:Panel"],
      properties: {
        header: { type: "string" },
      },
      allowChildren: true,
    },
    {
      name: "Button",
      category: "Controls",
      dependencies: ["primereact/button:Button"],
      properties: {
        label: { type: "string" },
      },
      events: {
        onClick: { returnType: "void", parameters: ["MouseEvent"] },
      },
      allowChildren: false,
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
      hidden: true,
      // type ?
      transform: (config) =>
        `const ${config.id} = ${config.dependencies[0]}<${config.properties.stateModel}>(${config.properties.value});`,
    },
  ],
};
