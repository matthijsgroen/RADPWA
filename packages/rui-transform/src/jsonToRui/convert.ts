import prettier from "prettier";
import ts, { factory as f } from "typescript";
import {
  ComponentMetaInformation,
  Resolver,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "../compiler-types";
import { getProjectComponents } from "../componentLibrary/getProjectComponents";
import { capitalize } from "../string-utils";
import { convertValue } from "../value-utils";

const getFlatComponentList = (
  structure: RuiJSONFormat,
): (RuiDataComponent | RuiVisualComponent)[] => {
  const result: (RuiDataComponent | RuiVisualComponent)[] = [];
  result.push(...structure.components);

  const pushNestedVisualComponents = (nodes: RuiVisualComponent[]) => {
    result.push(...nodes);
    nodes.forEach((node) => {
      Object.entries(node.childContainers || {}).forEach(([_k, v]) => {
        pushNestedVisualComponents(v);
      });
    });
  };
  pushNestedVisualComponents(structure.composition);
  return result;
};

const reactImport = () =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier("React"), undefined),
    f.createStringLiteral("react"),
  );

const helpersImport = () =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(
      true,
      undefined,
      f.createNamedImports(
        ["PropertiesOf", "EventsOf"].map<ts.ImportSpecifier>((name) =>
          f.createImportSpecifier(false, undefined, f.createIdentifier(name)),
        ),
      ),
    ),
    f.createStringLiteral("@rui/transform"),
  );

const componentsImport = (componentsModule: string) =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier("Components"), undefined),
    f.createStringLiteral(componentsModule),
  );

const eventHandlersImport = (handlersModule: string) =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier("eventHandlers"), undefined),
    f.createStringLiteral(handlersModule),
  );

const defineComponentTypes = () =>
  f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("CL"),
    undefined,
    f.createTypeQueryNode(f.createIdentifier("Components"), undefined),
  );

export const defineScopeType = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: Record<string, ComponentMetaInformation>,
) =>
  f.createTypeAliasDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    "Scope",
    undefined,
    f.createTypeLiteralNode(
      flatComponentList
        .filter(
          (c) =>
            c.component &&
            vcl[c.component] &&
            vcl[c.component].produces !== undefined,
        )
        .map((c) =>
          f.createPropertySignature(
            [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
            c.id,
            undefined,
            vcl[c.component].produces?.type,
          ),
        ),
    ),
  );

const wireVisualComponentsToReactComponents = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: Record<string, ComponentMetaInformation>,
) =>
  flatComponentList
    .filter((c) => vcl[c.component].isVisual)
    .map((c) =>
      f.createVariableStatement(
        undefined,
        f.createVariableDeclarationList(
          [
            f.createVariableDeclaration(
              f.createIdentifier(capitalize(c.id)),
              undefined,
              undefined,
              f.createPropertyAccessExpression(
                f.createPropertyAccessExpression(
                  f.createIdentifier("Components"),
                  f.createIdentifier(c.component),
                ),
                f.createIdentifier("vc"),
              ),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    );

const writeConstObject = (
  name: string,
  type: ts.TypeNode | undefined,
  members: ts.PropertyAssignment[],
) =>
  f.createVariableStatement(
    undefined,
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          f.createIdentifier(name),
          undefined,
          undefined,
          f.createObjectLiteralExpression(members, true),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

const writeComponentProperties = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
) =>
  writeConstObject(
    "properties",
    undefined,
    flatComponentList
      .filter((component) => component.props)
      .map<ts.PropertyAssignment>((component) => {
        return f.createPropertyAssignment(
          f.createIdentifier(capitalize(component.id)),
          f.createSatisfiesExpression(
            f.createObjectLiteralExpression(
              Object.entries(component.props || {}).map<ts.PropertyAssignment>(
                ([k, v]) =>
                  f.createPropertyAssignment(
                    f.createIdentifier(k),
                    convertValue(v),
                  ),
              ),
              true,
            ),
            f.createTypeReferenceNode(f.createIdentifier("PropertiesOf"), [
              f.createIndexedAccessTypeNode(
                f.createTypeReferenceNode(f.createIdentifier("CL"), undefined),
                f.createLiteralTypeNode(
                  f.createStringLiteral(component.component),
                ),
              ),
            ]),
          ),
        );
      })
      .filter((empty): empty is ts.PropertyAssignment => empty !== undefined),
  );

const createEventHandler = (
  component: RuiDataComponent | RuiVisualComponent,
  eventName: string,
  eventHandlerName: string,
  vcl: Record<string, ComponentMetaInformation>,
) => {
  const functionType = vcl[component.component].events[eventName].type;
  if (functionType && ts.isFunctionTypeNode(functionType)) {
    return f.createArrowFunction(
      undefined,
      undefined,
      functionType.parameters,
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createCallExpression(
        f.createPropertyAccessExpression(
          f.createCallExpression(
            f.createIdentifier("eventHandlers"),
            undefined,
            [f.createIdentifier("scope")],
          ),
          f.createIdentifier(eventHandlerName),
        ),
        undefined,
        functionType.parameters.map<ts.Identifier>((p, i) =>
          ts.isIdentifier(p.name) ? p.name : f.createIdentifier(`a${i}`),
        ),
      ),
    );
  }

  return f.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    f.createBlock([]),
  );
};

const writeComponentEvents = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: Record<string, ComponentMetaInformation>,
) =>
  writeConstObject(
    "events",
    undefined,
    flatComponentList
      .filter((c) => c.events)
      .map((component) =>
        f.createPropertyAssignment(
          capitalize(component.id),
          f.createSatisfiesExpression(
            f.createObjectLiteralExpression(
              Object.entries(component.events || {}).map<ts.PropertyAssignment>(
                ([k, v]) =>
                  f.createPropertyAssignment(
                    f.createIdentifier(k),
                    createEventHandler(component, k, v, vcl),
                  ),
              ),
              true,
            ),
            f.createTypeReferenceNode(f.createIdentifier("EventsOf"), [
              f.createIndexedAccessTypeNode(
                f.createTypeReferenceNode(f.createIdentifier("CL"), undefined),
                f.createLiteralTypeNode(
                  f.createStringLiteral(component.component),
                ),
              ),
            ]),
          ),
        ),
      ),
  );

const createComponentFunction = (name: string, statements: ts.Statement[]) =>
  f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          f.createIdentifier(name),
          undefined,
          undefined,
          f.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            f.createBlock(statements),
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

export const convertJsonToRui = async (
  structure: RuiJSONFormat,
  resolve: Resolver,
): Promise<string> => {
  const printer = ts.createPrinter();

  const componentLibraryInfo = await getProjectComponents(
    structure.componentLibrary,
    resolve,
  );

  const flatComponentList = getFlatComponentList(structure);
  const missingComponents = flatComponentList
    .map((c) => c.component)
    .filter((c) => !componentLibraryInfo[c]);

  if (missingComponents.length > 0) {
    throw new Error(
      `Defined components are missing from the library: ${missingComponents.join(", ")}`,
    );
  }

  //   console.log(
  //     JSON.stringify(
  //       componentLibraryInfo,
  //       (_key, value) => {
  //         if (value && ts.isTypeNode(value)) {
  //           return "(ts.TypeNode)";
  //         }
  //         return value;
  //       },
  //       2,
  //     ),
  //   );

  const sourceFile = f.createSourceFile(
    [
      reactImport(),
      helpersImport(),
      componentsImport(structure.componentLibrary),
      eventHandlersImport(structure.eventHandlers),
      defineComponentTypes(),
      defineScopeType(flatComponentList, componentLibraryInfo),
      createComponentFunction(structure.id, [
        ...wireVisualComponentsToReactComponents(
          flatComponentList,
          componentLibraryInfo,
        ),
        writeComponentProperties(flatComponentList),
        writeComponentEvents(flatComponentList, componentLibraryInfo),
      ]),
    ],
    f.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None,
  );

  const contents = prettier.format(printer.printFile(sourceFile), {
    parser: "typescript",
  });

  return contents;
};
