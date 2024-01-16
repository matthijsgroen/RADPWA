import * as prettier from "prettier";

const valueToCode = (value) => {
  switch (value.type) {
    case "string": {
      return `"${value.value}"`;
    }
    case "type": {
      return value.value;
    }
  }
  return '"unknown"';
};

const buildDataComponent = ({ props, id, component }, configuration) => {
  const componentDefinition = configuration.components.find(
    (c) => c.name === component,
  );
  if (!componentDefinition) {
    throw new Error(`Component definition for ${component} not found`);
  }

  const dependencies = componentDefinition.dependencies.map(
    (d) => `${d}:${component}`,
  );
  const evaluatedProps = Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, valueToCode(value)]),
  );

  const code = componentDefinition.transform({
    id,
    properties: evaluatedProps,
    dependencies: dependencies.map((d) => d.split(":")[2]),
  });

  return {
    id,
    name: component,
    code,
    dependencies,
  };
};

const buildProps = (props) =>
  Object.entries(props)
    .map(([key, value]) => ` ${key}={${valueToCode(value)}}`)
    .join(" ");

const buildVisualComponent = (
  { component, props, children = [], id },
  configuration,
) => {
  const codeProps = props ? buildProps(props) : "";

  const childDependencies = [];

  const childrenCode = children.map((c) => {
    if (typeof c === "string") {
      return c;
    }
    const comp = buildVisualComponent(c, configuration);
    childDependencies.push(...comp.dependencies);
    return comp.code;
  });

  const componentDefinition = configuration.components.find(
    (c) => c.name === component,
  );

  return {
    id,
    name: component,
    code:
      childrenCode.length === 0
        ? `<${component}${codeProps}/>`
        : `<${component}${codeProps}>${childrenCode.join("")}</${component}>`,
    dependencies: (componentDefinition
      ? componentDefinition.dependencies.map((d) => `${d}:${component}`)
      : []
    ).concat(childDependencies),
  };
};

export const compiler = async (interfaceFile, configuration) => {
  const mainId = interfaceFile["id"];

  const children = interfaceFile.children.map((visualComponent) =>
    buildVisualComponent(visualComponent, configuration),
  );

  const components = interfaceFile.components.map((component) =>
    buildDataComponent(component, configuration),
  );

  const dependencies = children
    .flatMap((child) => child.dependencies)
    .concat(components.flatMap((comp) => comp.dependencies));

  const code = await prettier.format(
    `
        ${dependencies
          .map((statement) => {
            const [entry, importName, componentName] = statement.split(":");
            if (importName === componentName) {
              return `import { ${componentName} } from "${entry}";`;
            }
            if (importName === "default") {
              return `import ${componentName} from "${entry}";`;
            }
            return `import { ${importName} as ${componentName} } from "${entry}";`;
          })
          .join("\n")}


        const ${mainId} = () => {
            ${components.map((e) => e.code)}

            return (
                ${children.map((e) => e.code)}
            )
        };

        export default ${mainId};
    `,
    { parser: "typescript" },
  );
  console.log(code);

  return code;
};
