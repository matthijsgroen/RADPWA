import ts from "typescript";
import {
  ComponentLibraryMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "../compiler-types";
import { capitalize, uncapitalize } from "../string-utils";
import { valueToJSON } from "../value-utils";

const getPropertiesFor = (
  properties: ts.ObjectLiteralExpression | undefined,
  id: string,
): Record<string, any> | undefined => {
  if (!properties) {
    return undefined;
  }
  let props: Record<string, any> = {};

  ts.forEachChild(properties, (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === id
    ) {
      let objectLiteral: ts.ObjectLiteralExpression | undefined = undefined;
      if (
        ts.isSatisfiesExpression(node.initializer) &&
        ts.isObjectLiteralExpression(node.initializer.expression)
      ) {
        objectLiteral = node.initializer.expression;
      }
      if (ts.isObjectLiteralExpression(node.initializer)) {
        objectLiteral = node.initializer;
      }

      if (objectLiteral) {
        props = valueToJSON(objectLiteral) as Record<string, any>;
      }
    }
  });

  if (Object.keys(props).length > 0) {
    return props;
  }
  return undefined;
};

const getEventsFor = (
  events: ts.ObjectLiteralExpression | undefined,
  id: string,
): Record<string, any> | undefined => {
  if (!events) {
    return undefined;
  }
  let result: Record<string, string> = {};

  ts.forEachChild(events, (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === id
    ) {
      let objectLiteral: ts.ObjectLiteralExpression | undefined = undefined;
      if (
        ts.isSatisfiesExpression(node.initializer) &&
        ts.isObjectLiteralExpression(node.initializer.expression)
      ) {
        objectLiteral = node.initializer.expression;
      }
      if (ts.isObjectLiteralExpression(node.initializer)) {
        objectLiteral = node.initializer;
      }

      if (objectLiteral) {
        ts.forEachChild(objectLiteral, (node) => {
          if (
            ts.isPropertyAssignment(node) &&
            ts.isIdentifier(node.name) &&
            ts.isArrowFunction(node.initializer) &&
            ts.isCallExpression(node.initializer.body) &&
            ts.isPropertyAccessExpression(node.initializer.body.expression) &&
            ts.isIdentifier(node.initializer.body.expression.name)
          ) {
            result[node.name.text] = node.initializer.body.expression.name.text;
          }
        });
      }
    }
  });

  if (Object.keys(result).length > 0) {
    return result;
  }
  return undefined;
};

const extractChildrenFromAttributes = (
  containerNames: string[],
  attributes: ts.JsxAttributes,
  componentMapping: Record<string, string>,
  vcl: ComponentLibraryMetaInformation,
  properties: ts.ObjectLiteralExpression | undefined,
  events: ts.ObjectLiteralExpression | undefined,
  propertiesAsState: Record<string, string[]>,
) => {
  const result: Record<string, RuiVisualComponent[]> = {};

  ts.forEachChild(attributes, (attribute) => {
    if (
      ts.isJsxAttribute(attribute) &&
      ts.isIdentifier(attribute.name) &&
      containerNames.includes(attribute.name.text) &&
      attribute.initializer &&
      ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression &&
      ts.isJsxChild(attribute.initializer.expression)
    ) {
      result[attribute.name.text] = convertJSXtoComponent(
        attribute.initializer.expression,
        componentMapping,
        vcl,
        properties,
        events,
        propertiesAsState,
      );
    }
  });

  return result;
};

const extractChildren = (
  componentType: string,
  element: ts.JsxChild,
  componentMapping: Record<string, string>,
  vcl: ComponentLibraryMetaInformation,
  properties: ts.ObjectLiteralExpression | undefined,
  events: ts.ObjectLiteralExpression | undefined,
  propertiesAsState: Record<string, string[]>,
): RuiVisualComponent["childContainers"] => {
  const componentInfo = vcl[componentType];
  const childContainers = Object.keys(componentInfo.childContainers);
  if (childContainers.length === 0) {
    return undefined;
  }

  let result: Record<string, RuiVisualComponent[]> = {};
  if (ts.isJsxSelfClosingElement(element)) {
    result = {
      ...result,
      ...extractChildrenFromAttributes(
        childContainers,
        element.attributes,
        componentMapping,
        vcl,
        properties,
        events,
        propertiesAsState,
      ),
    };
  }
  if (ts.isJsxElement(element)) {
    result = {
      ...result,
      ...extractChildrenFromAttributes(
        childContainers,
        element.openingElement.attributes,
        componentMapping,
        vcl,
        properties,
        events,
        propertiesAsState,
      ),
    };
    if (element.children && childContainers.includes("children")) {
      const children = element.children.flatMap((child) =>
        convertJSXtoComponent(
          child,
          componentMapping,
          vcl,
          properties,
          events,
          propertiesAsState,
        ),
      );
      result["children"] = (result.children || []).concat(children);
    }
  }

  if (Object.keys(result).length > 0) {
    return result;
  }

  return undefined;
};

const convertJSXtoComponent = (
  element: ts.JsxChild,
  componentMapping: Record<string, string>,
  vcl: ComponentLibraryMetaInformation,
  properties: ts.ObjectLiteralExpression | undefined,
  events: ts.ObjectLiteralExpression | undefined,
  propertiesAsState: Record<string, string[]>,
): RuiVisualComponent[] => {
  if (ts.isJsxSelfClosingElement(element) && ts.isIdentifier(element.tagName)) {
    const tagName = element.tagName.text;
    const componentType = componentMapping[tagName];

    const props = getPropertiesFor(properties, capitalize(tagName));
    const eventHandlers = getEventsFor(events, capitalize(tagName));

    const childContainers = extractChildren(
      componentType,
      element,
      componentMapping,
      vcl,
      properties,
      events,
      propertiesAsState,
    );
    const id = uncapitalize(tagName);
    const propsAsState = propertiesAsState[id]; //getPropertiesAsStateFor(propertiesAsState, id);

    return [
      {
        id,
        component: componentType,
        propsAsState,
        props,
        events: eventHandlers,
        childContainers,
      },
    ];
  }
  if (
    ts.isJsxElement(element) &&
    ts.isIdentifier(element.openingElement.tagName)
  ) {
    const id = element.openingElement.tagName.text;
    const componentType = componentMapping[id];

    const props = getPropertiesFor(properties, capitalize(id));
    const eventHandlers = getEventsFor(events, capitalize(id));

    const childContainers = extractChildren(
      componentType,
      element,
      componentMapping,
      vcl,
      properties,
      events,
      propertiesAsState,
    );

    return [
      {
        id: uncapitalize(id),
        component: componentType,
        props,
        events: eventHandlers,
        childContainers,
      },
    ];
  }
  if (ts.isJsxFragment(element)) {
    return element.children.flatMap((node) =>
      convertJSXtoComponent(
        node,
        componentMapping,
        vcl,
        properties,
        events,
        propertiesAsState,
      ),
    );
  }
  if (ts.isJsxText(element)) {
    if (element.text.trim().length === 0) {
      return [];
    }
    // TODO: How to deal with JSX text?
    return [];
  }

  return [];
};

const extractComposition = (
  component: ts.ArrowFunction,
  componentMapping: Record<string, string>,
  vcl: ComponentLibraryMetaInformation,
  properties: ts.ObjectLiteralExpression | undefined,
  events: ts.ObjectLiteralExpression | undefined,
  propertiesAsState: Record<string, string[]>,
): RuiVisualComponent[] => {
  const result: RuiVisualComponent[] = [];
  ts.forEachChild(component.body, (node) => {
    if (ts.isReturnStatement(node)) {
      if (node.expression && ts.isJsxChild(node.expression)) {
        result.push(
          ...convertJSXtoComponent(
            node.expression,
            componentMapping,
            vcl,
            properties,
            events,
            propertiesAsState,
          ),
        );
      }
      if (
        node.expression &&
        ts.isParenthesizedExpression(node.expression) &&
        node.expression.expression &&
        ts.isJsxChild(node.expression.expression)
      ) {
        result.push(
          ...convertJSXtoComponent(
            node.expression.expression,
            componentMapping,
            vcl,
            properties,
            events,
            propertiesAsState,
          ),
        );
      }
    }
  });
  return result;
};

export const convertRuiToJson = async (
  program: ts.Program,
  sourcePath: string,
  vcl: ComponentLibraryMetaInformation,
): Promise<RuiJSONFormat> => {
  const sourceFile = program.getSourceFile(sourcePath);
  if (!sourceFile) {
    return {
      componentLibrary: "",
      eventHandlers: "",
      id: "NewScreen",
      components: [],
      composition: [],
    };
  }

  // https://stackoverflow.com/questions/61597612/how-to-properly-handle-let-variables-with-callbacks-in-typescript
  let component = undefined as ts.ArrowFunction | undefined;
  let componentImport = undefined as ts.Identifier | undefined;
  let propertiesAsState: Record<string, string[]> = {};
  let componentLibrary = "";
  let eventHandlers = "";
  let id = "";

  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      ts.isImportClause(node.importClause) &&
      node.importClause.name &&
      ts.isIdentifier(node.importClause.name) &&
      node.importClause.name.text === "Components"
    ) {
      componentImport = node.importClause.name;
      componentLibrary = (node.moduleSpecifier as ts.StringLiteral).text;
    }
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      ts.isImportClause(node.importClause) &&
      node.importClause.name &&
      ts.isIdentifier(node.importClause.name) &&
      node.importClause.name.text === "eventHandlers"
    ) {
      eventHandlers = (node.moduleSpecifier as ts.StringLiteral).text;
    }
    if (
      ts.isVariableStatement(node) &&
      node.modifiers &&
      node.modifiers[0].kind === ts.SyntaxKind.ExportKeyword
    ) {
      const varDeclaration = node.declarationList.declarations[0];
      if (ts.isIdentifier(varDeclaration.name)) {
        id = varDeclaration.name.text;
      }
      if (
        varDeclaration.initializer &&
        ts.isArrowFunction(varDeclaration.initializer)
      ) {
        component = varDeclaration.initializer;
      }
    }
  });

  if (!component || !componentImport) {
    return {
      componentLibrary,
      eventHandlers,
      id,
      components: [],
      composition: [],
    };
  }

  // const componentsFile = program.getSourceFile(componentsFileResolve);
  // console.log(componentsFile);

  let properties = undefined as ts.ObjectLiteralExpression | undefined;
  let events = undefined as ts.ObjectLiteralExpression | undefined;
  let scope = undefined as ts.ObjectLiteralExpression | undefined;
  const componentMapping: Record<string, string> = {};

  ts.forEachChild(component.body, (node) => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations[0]) {
      const declaration = node.declarationList.declarations[0];
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        if (declaration.name.text === "properties") {
          properties = declaration.initializer;
        }
        if (declaration.name.text === "events") {
          events = declaration.initializer;
        }
        if (declaration.name.text === "scope") {
          scope = declaration.initializer;
        }
      }
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isPropertyAccessExpression(declaration.initializer) &&
        ts.isPropertyAccessExpression(declaration.initializer.expression) &&
        ts.isIdentifier(declaration.initializer.expression.name)
      ) {
        const componentType = declaration.initializer.expression.name.text;
        const componentName = declaration.name.text;
        componentMapping[componentName] = componentType;
      }
    }
  });

  const components: RuiDataComponent[] = [];
  if (scope) {
    const extractDataComponent = (
      id: string,
      node: ts.Node,
    ): RuiDataComponent | undefined => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        ts.isIdentifier(node.expression.expression.name)
      ) {
        const propertyAccess = node.expression.expression;
        const componentName = propertyAccess.name.text;

        const componentInfo = vcl[componentName];
        if (componentInfo && componentInfo.isVisual === false) {
          const props = getPropertiesFor(properties, capitalize(id));
          const eventHandlers = getEventsFor(events, capitalize(id));

          return {
            id,
            component: componentName,
            props,
            events: eventHandlers,
          };
        }
      }
    };

    // detect 'data components' & props and state
    ts.forEachChild(scope, (node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const id = node.name.text;
        const component = extractDataComponent(id, node.initializer);
        if (component) {
          components.push(component);
        }
        if (
          ts.isCallExpression(node.initializer) &&
          ts.isIdentifier(node.initializer.expression) &&
          node.initializer.expression.text === "exposePropsAsState"
        ) {
          const source = node.initializer.arguments[0];
          const component = extractDataComponent(id, source);

          const stateProps = node.initializer.arguments
            .map((v, i) => {
              if (i > 1 && ts.isStringLiteral(v)) {
                return v.text;
              }
            })
            .filter((prop): prop is string => prop !== undefined);
          if (component) {
            components.push({
              ...component,
              propsAsState: stateProps,
            });
          } else {
            propertiesAsState[id] = stateProps;
          }
        }
      }
    });
  }

  const composition = extractComposition(
    component,
    componentMapping,
    vcl,
    properties,
    events,
    propertiesAsState,
  );

  return {
    componentLibrary,
    eventHandlers,
    id,
    components,
    composition,
  };
};
