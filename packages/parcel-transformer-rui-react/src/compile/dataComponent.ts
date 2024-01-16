import { valueToCode } from "./valueToCode";

export const buildDataComponent = (
  { props, id, component },
  configuration,
  logicBlocks,
) => {
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
    Object.entries(props).map(([key, value]) => [
      key,
      valueToCode(value, logicBlocks),
    ]),
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
