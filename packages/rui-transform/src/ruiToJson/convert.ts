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

const responseIWishIHad: RuiJSONFormat = {
  componentLibrary: "../rapid-components",
  eventHandlers: "./ExperimentScreen.events",

  id: "MainScreen",

  components: [
    {
      id: "user",
      component: "ComponentState",
      props: {
        initialValue: "Hello World",
      },
    },
  ],

  composition: [
    {
      id: "panel1",
      component: "Panel",
      props: {
        header: "Hello",
      },
      childContainers: {
        children: [
          {
            id: "text1",
            component: "Text",
            props: {
              content: "Hello world",
            },
          },
          {
            id: "button1",
            component: "Button",
            props: {
              caption: "Press me",
            },
            events: {
              onClick: "demoButtonClick",
            },
          },
          {
            id: "button2",
            component: "Button",
            props: {
              caption: "Disable other",
            },
            events: {
              onClick: "button2click",
            },
          },
        ],
      },
    },
  ],
};

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
        // TODO: extract function names
      }
    }
  });

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
    console.log(vcl[componentType]);

    const props = getPropertiesFor(properties, capitalize(id));
    const eventHandlers = getEventsFor(events, capitalize(id));
    return [
      {
        id: uncapitalize(id),
        component: componentType,
        props,
        events: eventHandlers,
      },
    ];
  }
  return [
    {
      id: "blub",
      component: "Foo",
    },
  ];
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
