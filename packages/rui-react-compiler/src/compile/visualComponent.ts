import { Config } from "../Config";
import { emptyLogicMap } from "./logic";
import { buildProps } from "./properties";

const flattenProps = (props) =>
  Object.entries(props)
    .map(([k, v]) => ` ${k}={${v}}`)
    .join("");

const hasChildren = (container, name) =>
  container?.[name] && container[name].length > 0;

const defaultTransform = ({
  id,
  componentName,
  properties,
  events,
  childContainers,
}) =>
  hasChildren(childContainers, "children")
    ? `<${componentName}${flattenProps(properties)}${flattenProps(events)}>${childContainers.children.join("")}</${componentName}>`
    : `<${componentName}${flattenProps(properties)}${flattenProps(events)}/>`;

export const buildVisualComponent = (
  { component, props, events, id, ...rest },
  configuration: Config,
  logicBlocks,
) => {
  const evaluatedProps = props
    ? buildProps(props, logicBlocks)
    : emptyLogicMap();
  const evaluatedEvents = events
    ? buildProps(events, logicBlocks)
    : emptyLogicMap();

  const componentDefinition = configuration.components.find(
    (c) => c.name === component,
  );
  if (!componentDefinition) {
    throw new Error(`Component definition for ${component} not found`);
  }
  if (componentDefinition.hidden === true) {
    throw new Error(
      `Component ${component} is a data component. A visual component was expected.`,
    );
  }

  const childDependencies: string[] = [];
  const childContainers = {};

  const containerNames =
    componentDefinition.childContainers?.map((c) =>
      typeof c === "string" ? c : c.name,
    ) ?? (componentDefinition.allowChildren ? ["children"] : []);

  containerNames.forEach((c) => {
    const childCodes = (rest[c] ?? []).map((child) => {
      if (typeof child === "string") {
        return child;
      }
      const comp = buildVisualComponent(child, configuration, logicBlocks);
      childDependencies.push(...comp.dependencies);
      return comp.code;
    });
    childContainers[c] = childCodes;
  });

  const transform = componentDefinition.transform ?? defaultTransform;
  const componentName = componentDefinition.componentName ?? component;

  const dependencies: string[] = (componentDefinition.dependencies ?? []).map(
    (d) => `${d}:${componentName}`,
  );

  const componentData = {
    id,
    componentName,
    properties: evaluatedProps.map,
    events: evaluatedEvents.map,
    childContainers,
    dependencies: dependencies.map((d) => d.split(":")[2]),
  };

  const helpers = {
    hasChildren: (containerName) => hasChildren(childContainers, containerName),
    toChildrenString: (containerName) =>
      (childContainers[containerName] ?? []).join(""),
    flattenProps: (props) => flattenProps(props),
    pickAndRemap: (props, remap) =>
      Object.fromEntries(
        Object.entries(remap)
          .filter(([from]) => props[from])
          .map(([from, to]) => [to, props[from]]),
      ),
  };

  return {
    id,
    name: component,
    code: transform(componentData, helpers),
    dependencies: dependencies.concat(
      childDependencies,
      evaluatedEvents.dependencies,
      evaluatedProps.dependencies,
    ),
  };
};
