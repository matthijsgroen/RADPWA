import { valueToCode } from "./valueToCode";

const buildProps = (props, logicBlocks) =>
  Object.entries(props)
    .map(([key, value]) => ` ${key}={${valueToCode(value, logicBlocks)}}`)
    .join(" ");

export const buildVisualComponent = (
  { component, props, events, children = [], id },
  configuration,
  logicBlocks,
) => {
  const codeProps = props ? buildProps(props, logicBlocks) : "";
  const codeEvents = events ? buildProps(events, logicBlocks) : "";

  const childDependencies = [];

  const childrenCode = children.map((c) => {
    if (typeof c === "string") {
      return c;
    }
    const comp = buildVisualComponent(c, configuration, logicBlocks);
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
        ? `<${component}${codeProps}${codeEvents}/>`
        : `<${component}${codeProps}${codeEvents}>${childrenCode.join("")}</${component}>`,
    dependencies: (componentDefinition
      ? componentDefinition.dependencies.map((d) => `${d}:${component}`)
      : []
    ).concat(childDependencies),
  };
};
