import ts, { StringLiteral } from "typescript";
import {
  ComponentLibraryMetaInformation,
  Resolver,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "../compiler-types";
import { getProjectComponents } from "../componentLibrary/getProjectComponents";
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
      ),
    };
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
): RuiVisualComponent[] => {
  if (ts.isJsxSelfClosingElement(element) && ts.isIdentifier(element.tagName)) {
    const id = element.tagName.text;
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
      convertJSXtoComponent(node, componentMapping, vcl, properties, events),
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
          ),
        );
      }
    }
  });
  return result;
};

export const convertRuiToJson = async (
  tsxSource: string,
  resolve: Resolver,
): Promise<RuiJSONFormat> => {
  const sourceFile = ts.createSourceFile("source.rui.tsx", tsxSource, {
    languageVersion: ts.ScriptTarget.Latest,
  });

  let componentLibrary = "";
  let eventHandlers = "";
  let id = "";
  // https://stackoverflow.com/questions/61597612/how-to-properly-handle-let-variables-with-callbacks-in-typescript
  let component = undefined as ts.ArrowFunction | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      ts.isImportClause(node.importClause) &&
      node.importClause.name &&
      ts.isIdentifier(node.importClause.name) &&
      node.importClause.name.text === "Components"
    ) {
      componentLibrary = (node.moduleSpecifier as StringLiteral).text;
    }
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      ts.isImportClause(node.importClause) &&
      node.importClause.name &&
      ts.isIdentifier(node.importClause.name) &&
      node.importClause.name.text === "eventHandlers"
    ) {
      eventHandlers = (node.moduleSpecifier as StringLiteral).text;
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

  if (!component) {
    return {
      componentLibrary,
      eventHandlers,
      id,
      components: [],
      composition: [],
    };
  }

  const componentLibraryInfo = await getProjectComponents(
    componentLibrary,
    resolve,
  );

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
    // detect 'data components'
    ts.forEachChild(scope, (node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const id = node.name.text;
        if (
          ts.isCallExpression(node.initializer) &&
          ts.isPropertyAccessExpression(node.initializer.expression) &&
          ts.isPropertyAccessExpression(
            node.initializer.expression.expression,
          ) &&
          ts.isIdentifier(node.initializer.expression.expression.name)
        ) {
          const propertyAccess = node.initializer.expression.expression;
          const componentName = propertyAccess.name.text;

          const componentInfo = componentLibraryInfo[componentName];
          if (componentInfo && componentInfo.isVisual === false) {
            const props = getPropertiesFor(properties, capitalize(id));
            const eventHandlers = getEventsFor(events, capitalize(id));

            components.push({
              id,
              component: componentName,
              props,
              events: eventHandlers,
            });
          }
        }
      }
    });
  }

  const composition = extractComposition(
    component,
    componentMapping,
    componentLibraryInfo,
    properties,
    events,
  );

  return {
    componentLibrary,
    eventHandlers,
    id,
    components,
    composition,
  };
};
