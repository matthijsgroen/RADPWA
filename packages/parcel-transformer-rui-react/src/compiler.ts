const valueToCode = (value) =>
  value.type === "string" ? `"${value.value}"` : `"unknown"`;

const buildProps = (props) =>
  Object.entries(props)
    .map(([key, value]) => ` ${key}={${valueToCode(value)}}`)
    .join(" ");

const buildComponent = ({ component, props, children, dependencies }) => {
  const codeProps = props ? buildProps(props) : "";

  const childDependencies = [];

  const childrenCode = children.map((c) => {
    if (typeof c === "string") {
      return c;
    }
    const comp = buildComponent(c);
    childDependencies.push(...comp.dependencies);

    return comp.code;
  });
  return {
    name: component,
    code: `<${component}${codeProps}>${childrenCode.join("")}</${component}>`,
    dependencies: dependencies.concat(childDependencies),
  };
};

export const compiler = (configFile) => {
  const mainId = configFile["id"];

  const children = Object.entries(configFile.children).map(
    ([key, componentDesc]) => {
      return {
        id: key,
        ...buildComponent(componentDesc),
      };
    }
  );

  const code = `
        ${children
          .flatMap(({ dependencies, name }) =>
            dependencies.map((statement) => {
              const [entry, importName] = statement.split(":");
              if (importName === name) {
                return `import { ${importName} } from "${entry}";`;
              }
              return `import { ${importName} as ${name} } from "${entry}";`;
            })
          )
          .join("\n")}

        const ${mainId} = () => {
            return (
                ${children.map((e) => e.code)}
            )
        };

        export default ${mainId};
    `;
  console.log(code);

  return code;
};
