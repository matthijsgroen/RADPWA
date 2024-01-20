const primeReactComponents = require("@rui/prime-react").default;

/** @type {import('@rui/react-compiler').Config} */
module.exports = {
  components: [
    ...primeReactComponents.components,
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
      name: "Text",
      category: "TextBlock",
      dependencies: [],
      componentName: "p",
      properties: {},
      allowChildren: true,
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
      produces: (config) => `{ value: ${config.properties.stateModel}; }`,
      hidden: true,
      transform: (config) =>
        `const ${config.id} = ${config.dependencies[0]}<${config.properties.stateModel}>(${config.properties.value});`,
    },
  ],
};
