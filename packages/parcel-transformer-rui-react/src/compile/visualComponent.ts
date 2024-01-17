import { valueToCode } from "./valueToCode";

const buildProps = (props, logicBlocks) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      key,
      valueToCode(value, logicBlocks),
    ]),
  );

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
  configuration,
  logicBlocks,
) => {
  const evaluatedProps = props ? buildProps(props, logicBlocks) : {};
  const evaluatedEvents = events ? buildProps(events, logicBlocks) : {};

  const componentDefinition = configuration.components.find(
    (c) => c.name === component,
  );

  const childDependencies = [];
  const childContainers = {};

  const containerNames =
    componentDefinition.childContainers ??
    (componentDefinition.allowChildren ? ["children"] : []);

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

  const dependencies = (componentDefinition.dependencies ?? []).map(
    (d) => `${d}:${componentName}`,
  );

  const componentData = {
    id,
    componentName,
    properties: evaluatedProps,
    events: evaluatedEvents,
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
    dependencies: dependencies.concat(childDependencies),
  };
};
