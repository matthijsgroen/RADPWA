import { emptyLogicMap } from "./logic";
import { buildProps } from "./properties";

export const buildDataComponent = (
  { props = {}, id, component, events = {} },
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

  const evaluatedProps = props
    ? buildProps(props, logicBlocks)
    : emptyLogicMap();
  const evaluatedEvents = events
    ? buildProps(events, logicBlocks)
    : emptyLogicMap();

  const code = componentDefinition.transform({
    id,
    properties: evaluatedProps.map,
    events: evaluatedEvents.map,
    dependencies: dependencies.map((d) => d.split(":")[2]),
  });

  const fullDependencies = dependencies.concat(
    ...evaluatedProps.dependencies,
    ...evaluatedEvents.dependencies,
  );

  return {
    id,
    name: component,
    code,
    dependencies: fullDependencies,
  };
};
