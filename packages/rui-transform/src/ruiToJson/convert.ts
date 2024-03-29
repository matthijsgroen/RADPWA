import ts, { createPrinter } from "typescript";
import {
  ComponentLibraryMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiTypeDeclaration,
  RuiVisualComponent,
} from "../compiler-types";
import { capitalize, uncapitalize } from "../string-utils";
import { valueToJSON } from "../value-utils";
import { basename } from "path";

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

const getScopeReferences = (
  attributes: ts.JsxAttributes,
  context: ExtractionContext,
): Record<string, { ref: string }> => {
  const result: Record<string, { ref: string }> = {};
  attributes.forEachChild((node) => {
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression &&
      ts.isPropertyAccessExpression(node.initializer.expression)
    ) {
      const propStart = node.initializer.expression;
      const reference = propStart.getText(context.sourceFile);
      if (reference.startsWith("scope.")) {
        result[node.name.text] = { ref: reference.slice("scope.".length) };
      }
    }
  });

  return result;
};

const extractChildrenFromAttributes = (
  containerNames: string[],
  attributes: ts.JsxAttributes,
  context: ExtractionContext,
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
        context,
      );
    }
  });

  return result;
};

const extractChildren = (
  componentType: string,
  element: ts.JsxChild,
  context: ExtractionContext,
): RuiVisualComponent["childContainers"] => {
  const componentInfo = context.vcl[componentType];
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
        context,
      ),
    };
  }
  if (ts.isJsxElement(element)) {
    result = {
      ...result,
      ...extractChildrenFromAttributes(
        childContainers,
        element.openingElement.attributes,
        context,
      ),
    };
    if (element.children && childContainers.includes("children")) {
      const children = element.children.flatMap((child) =>
        convertJSXtoComponent(child, context),
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
  context: ExtractionContext,
): RuiVisualComponent[] => {
  if (ts.isJsxSelfClosingElement(element) && ts.isIdentifier(element.tagName)) {
    const tagName = element.tagName.text;
    const componentType = context.componentMapping[tagName];

    const props = getPropertiesFor(context.properties, capitalize(tagName));
    const eventHandlers = getEventsFor(context.events, capitalize(tagName));

    const references = getScopeReferences(element.attributes, context);
    if (props && references) {
      Object.assign(props, references);
    }

    const childContainers = extractChildren(componentType, element, context);
    const id = uncapitalize(tagName);
    const propsAsState = context.propertiesAsState[id];

    return [
      {
        id,
        type: "visual",
        component: componentType,
        propsAsState,
        props: props ? props : references ? references : undefined,
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
    const componentType = context.componentMapping[id];

    const props = getPropertiesFor(context.properties, capitalize(id));
    const eventHandlers = getEventsFor(context.events, capitalize(id));

    const childContainers = extractChildren(componentType, element, context);

    return [
      {
        id: uncapitalize(id),
        type: "visual",
        component: componentType,
        props,
        events: eventHandlers,
        childContainers,
      },
    ];
  }
  if (ts.isJsxFragment(element)) {
    return element.children.flatMap((node) =>
      convertJSXtoComponent(node, context),
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

const extractChildContainers = (
  node: ts.Expression,
  context: ExtractionContext,
): Record<string, RuiDataComponent[]> => {
  const result: Record<string, RuiDataComponent[]> = {};
  if (ts.isObjectLiteralExpression(node)) {
    node.properties.forEach((e) => {
      if (
        ts.isPropertyAssignment(e) &&
        ts.isIdentifier(e.name) &&
        ts.isObjectLiteralExpression(e.initializer)
      ) {
        const childList: RuiDataComponent[] = [];
        e.initializer.properties.forEach((pr) => {
          if (ts.isPropertyAssignment(pr) && ts.isIdentifier(pr.name)) {
            const childId = pr.name.text;
            const childComponent = extractDataComponent(
              childId,
              pr.initializer,
              context,
            );
            if (childComponent) {
              childList.push(childComponent);
            }
          }
        });

        result[e.name.text] = childList;
      }
    });
  }
  return result;
};

type ExtractionContext = {
  componentMapping: Record<string, string>;
  vcl: ComponentLibraryMetaInformation;
  properties: ts.ObjectLiteralExpression | undefined;
  events: ts.ObjectLiteralExpression | undefined;
  propertiesAsState: Record<string, string[]>;
  sourceFile: ts.SourceFile;
};

const extractComposition = (
  component: ts.ArrowFunction,
  context: ExtractionContext,
): RuiVisualComponent[] => {
  const result: RuiVisualComponent[] = [];
  ts.forEachChild(component.body, (node) => {
    if (ts.isReturnStatement(node)) {
      if (node.expression && ts.isJsxChild(node.expression)) {
        result.push(...convertJSXtoComponent(node.expression, context));
      }
      if (
        node.expression &&
        ts.isParenthesizedExpression(node.expression) &&
        node.expression.expression &&
        ts.isJsxChild(node.expression.expression)
      ) {
        result.push(
          ...convertJSXtoComponent(node.expression.expression, context),
        );
      }
    }
  });
  return result;
};

const extractDataComponent = (
  id: string,
  node: ts.Node,
  context: ExtractionContext,
): RuiDataComponent | undefined => {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isPropertyAccessExpression(node.expression.expression) &&
    ts.isIdentifier(node.expression.expression.name)
  ) {
    const propertyAccess = node.expression.expression;
    const componentName = propertyAccess.name.text;

    const componentInfo = context.vcl[componentName];
    if (componentInfo && componentInfo.isVisual === false) {
      const props = getPropertiesFor(context.properties, capitalize(id));
      const eventHandlers = getEventsFor(context.events, capitalize(id));

      return {
        id,
        type: "data",
        component: componentName,
        props,
        events: eventHandlers,
      };
    }
  }
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "exposePropsAsState"
  ) {
    const source = node.arguments[0];
    const component = extractDataComponent(id, source, context);

    const stateProps = node.arguments
      .map((v, i) => {
        if (i > 1 && ts.isStringLiteral(v)) {
          return v.text;
        }
      })
      .filter((prop): prop is string => prop !== undefined);
    if (component) {
      return {
        ...component,
        propsAsState: stateProps,
      };
    } else {
      context.propertiesAsState[id] = stateProps;
    }
  }
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "composeDataChildren"
  ) {
    const source = node.arguments[0];
    const component = extractDataComponent(id, source, context);

    const childContainers = extractChildContainers(node.arguments[1], context);
    if (component) {
      return {
        ...component,
        childContainers,
      };
    }
  }
};

const extractInterface = (
  interfaceDefinition: ts.TypeLiteralNode | undefined,
  context: ExtractionContext,
): Record<string, RuiTypeDeclaration> => {
  if (interfaceDefinition === undefined) {
    return {};
  }
  const printer = createPrinter();
  // TODO enrich types also with descriptions from JSDoc

  const result: Record<string, RuiTypeDeclaration> = {};
  for (const member of interfaceDefinition.members) {
    if (
      ts.isPropertySignature(member) &&
      ts.isIdentifier(member.name) &&
      member.type
    ) {
      result[member.name.text] = {
        type: printer.printNode(
          ts.EmitHint.Unspecified,
          member.type,
          context.sourceFile,
        ),
        optional: member.questionToken !== undefined,
        dependencies: [],
      };
    }
  }

  return result;
};

export const convertRuiToJson = (
  fileName: string,
  sourceContents: string,
  vcl: ComponentLibraryMetaInformation,
): RuiJSONFormat => {
  // const sourceFile = program.getSourceFile(sourcePath);
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceContents,
    ts.ScriptTarget.Latest,
  );
  if (!sourceFile) {
    return {
      componentLibrary: "",
      eventHandlers: "",
      id: "NewScreen",
      interface: {},
      components: [],
      composition: [],
    };
  }

  // https://stackoverflow.com/questions/61597612/how-to-properly-handle-let-variables-with-callbacks-in-typescript
  let component = undefined as ts.ArrowFunction | undefined;
  let componentImport = undefined as ts.Identifier | undefined;
  let propertiesAsState: Record<string, string[]> = {};
  let interfaceDefinition: ts.TypeLiteralNode | undefined;
  let componentLibrary: string | null = null;
  let eventHandlers: string | null = null;

  let id = basename(fileName, ".rui.tsx");

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
      ts.isTypeAliasDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "Props" &&
      ts.isTypeLiteralNode(node.type)
    ) {
      interfaceDefinition = node.type;
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
      interface: {},
      components: [],
      composition: [],
    };
  }

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

  const context: ExtractionContext = {
    componentMapping,
    vcl,
    properties,
    events,
    propertiesAsState,
    sourceFile,
  };

  const components: RuiDataComponent[] = [];
  if (scope) {
    // detect 'data components' & props and state
    ts.forEachChild(scope, (node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const id = node.name.text;
        const component = extractDataComponent(id, node.initializer, context);
        if (component) {
          components.push(component);
        }
      }
    });
  }

  const composition = extractComposition(component, context);
  const componentInterface = extractInterface(interfaceDefinition, context);

  return {
    componentLibrary,
    eventHandlers,
    id,
    interface: componentInterface,
    components,
    composition,
  };
};
