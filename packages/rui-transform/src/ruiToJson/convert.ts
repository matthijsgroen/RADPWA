import ts, { StringLiteral } from "typescript";
import { Resolver, RuiJSONFormat } from "../compiler-types";
import { getProjectComponents } from "../componentLibrary/getProjectComponents";

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
  let component: ts.ArrowFunction | undefined = undefined;

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
  console.log(Object.keys(componentLibraryInfo));

  return {
    componentLibrary,
    eventHandlers,
    id,
    components: [],
    composition: [],
  };
};
