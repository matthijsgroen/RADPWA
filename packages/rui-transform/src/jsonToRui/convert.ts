import prettier from "prettier";
import ts, {
  ObjectLiteralElementLike,
  addSyntheticLeadingComment,
  factory as f,
} from "typescript";
import {
  ComponentLibraryMetaInformation,
  ComponentMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "../compiler-types";
import { capitalize } from "../string-utils";
import { convertValue } from "../value-utils";
import { isVisualComponent } from "../type-utils";

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
  vcl: ComponentLibraryMetaInformation,
) => {
  const componentsWithPropsAsState = flatComponentList.filter(
    (c): c is RuiVisualComponent =>
      "propsAsState" in c && (c.propsAsState?.length ?? 0) > 0,
  );
  return f.createTypeAliasDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    "Scope",
    undefined,
    f.createIntersectionTypeNode([
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
      ...(componentsWithPropsAsState.length > 0
        ? [
            f.createTypeLiteralNode(
              componentsWithPropsAsState.map((c) =>
                f.createPropertySignature(
                  [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
                  c.id,
                  undefined,
                  f.createTypeLiteralNode(
                    (c.propsAsState ?? []).map((prop) =>
                      f.createPropertySignature(
                        undefined,
                        prop,
                        undefined,
                        vcl[c.component].properties[prop].type,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ]
        : []),
    ]),
  );
};

const wireVisualComponentsToReactComponents = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: ComponentLibraryMetaInformation,
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
  typeName: string | undefined,
  members: ts.PropertyAssignment[],
) =>
  f.createVariableStatement(
    undefined,
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          f.createIdentifier(name),
          undefined,
          typeName
            ? f.createTypeReferenceNode(f.createIdentifier(typeName), undefined)
            : undefined,
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
  vcl: ComponentLibraryMetaInformation,
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

const hasPropsAsState = (
  component: RuiDataComponent | RuiVisualComponent,
  vcl: ComponentLibraryMetaInformation,
): component is RuiVisualComponent =>
  isVisualComponent(component, vcl) &&
  !!component.propsAsState &&
  component.propsAsState.length > 0;

const wrapWithPropsAsState = (
  component: RuiDataComponent | RuiVisualComponent,
  vcl: ComponentLibraryMetaInformation,
  contents: ts.Expression,
): ts.Expression =>
  hasPropsAsState(component, vcl)
    ? f.createCallExpression(
        f.createIdentifier("exposePropsAsState"),
        undefined,
        [
          contents,
          f.createPropertyAccessExpression(
            f.createIdentifier("properties"),
            f.createIdentifier(capitalize(component.id)),
          ),
          ...(component.propsAsState ?? []).map((p) =>
            f.createStringLiteral(p),
          ),
        ],
      )
    : contents;

const writeScope = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: ComponentLibraryMetaInformation,
) =>
  writeConstObject(
    "scope",
    "Scope",
    flatComponentList
      .filter((c) => vcl[c.component].produces || hasPropsAsState(c, vcl))
      .map((c) => {
        const infoModel: ObjectLiteralElementLike[] = [];

        if (c.props) {
          infoModel.push(
            f.createSpreadAssignment(
              f.createPropertyAccessExpression(
                f.createIdentifier("properties"),
                f.createIdentifier(capitalize(c.id)),
              ),
            ),
          );
        }
        if (c.events) {
          infoModel.push(
            f.createSpreadAssignment(
              f.createPropertyAccessExpression(
                f.createIdentifier("events"),
                f.createIdentifier(capitalize(c.id)),
              ),
            ),
          );
        }

        const production = vcl[c.component].produces
          ? f.createCallExpression(
              f.createPropertyAccessExpression(
                f.createPropertyAccessExpression(
                  f.createIdentifier("Components"),
                  f.createIdentifier(c.component),
                ),
                f.createIdentifier("produce"),
              ),
              undefined,
              [f.createObjectLiteralExpression(infoModel)],
            )
          : f.createObjectLiteralExpression([]);

        return f.createPropertyAssignment(
          c.id,
          wrapWithPropsAsState(c, vcl, production),
        );
      }),
  );

const createCompositionNode = (
  node: RuiVisualComponent,
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: Record<string, ComponentMetaInformation>,
) => {
  const usesChildren = node.childContainers?.children?.length;
  const capNodeId = capitalize(node.id);
  const componentInfo = vcl[node.component];

  const attributes: ts.JsxAttributeLike[] = [];
  if (node.props) {
    attributes.push(
      f.createJsxSpreadAttribute(
        f.createPropertyAccessExpression(
          f.createIdentifier("properties"),
          f.createIdentifier(capNodeId),
        ),
      ),
    );
  }
  if (componentInfo.produces || node.propsAsState) {
    attributes.push(
      f.createJsxSpreadAttribute(
        f.createPropertyAccessExpression(
          f.createIdentifier("scope"),
          f.createIdentifier(node.id),
        ),
      ),
    );
  }
  if (node.events) {
    attributes.push(
      f.createJsxSpreadAttribute(
        f.createPropertyAccessExpression(
          f.createIdentifier("events"),
          f.createIdentifier(capNodeId),
        ),
      ),
    );
  }

  if (usesChildren) {
    const children = writeCompositionTree(
      node.childContainers?.children ?? [],
      flatComponentList,
      vcl,
    );
    const addChildren: ts.NodeArray<ts.JsxChild> = ts.isJsxFragment(children)
      ? children.children
      : f.createNodeArray([children]);

    return f.createJsxElement(
      f.createJsxOpeningElement(
        f.createIdentifier(capNodeId),
        undefined,
        f.createJsxAttributes(attributes),
      ),
      addChildren,
      f.createJsxClosingElement(f.createIdentifier(capNodeId)),
    );
  }
  return f.createJsxSelfClosingElement(
    f.createIdentifier(capNodeId),
    undefined,
    f.createJsxAttributes(attributes),
  );
};

const writeCompositionTree = (
  nodes: RuiVisualComponent[],
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: Record<string, ComponentMetaInformation>,
  singleChild = true,
) => {
  if (nodes.length === 1) {
    return createCompositionNode(nodes[0], flatComponentList, vcl);
  }

  return f.createJsxFragment(
    f.createJsxOpeningFragment(),
    nodes.map((node) => createCompositionNode(node, flatComponentList, vcl)),
    f.createJsxJsxClosingFragment(),
  );
};

const createCommentBlock = (lines: string[]): string =>
  ["*", ...lines.map((l) => `* ${l}`), "*"].join("\n");

export const convertJsonToRui = async (
  structure: RuiJSONFormat,
  vcl: ComponentLibraryMetaInformation,
): Promise<string> => {
  const printer = ts.createPrinter();

  const flatComponentList = getFlatComponentList(structure);
  const missingComponents = flatComponentList
    .map((c) => c.component)
    .filter((c) => !vcl[c]);

  if (missingComponents.length > 0) {
    throw new Error(
      `Defined components are missing from the library: ${missingComponents.join(", ")}`,
    );
  }

  const sourceFile = f.createSourceFile(
    [
      addSyntheticLeadingComment(
        reactImport(),
        ts.SyntaxKind.MultiLineCommentTrivia,
        createCommentBlock([
          "This is an auto generated file. DO NOT EDIT MANUALLY.",
          "Please use our Editor plugin to edit this file.",
          "For more information about Rapid UI, see: ....",
        ]),
        true,
      ),
      helpersImport(),
      componentsImport(structure.componentLibrary),
      eventHandlersImport(structure.eventHandlers),
      defineComponentTypes(),
      defineScopeType(flatComponentList, vcl),
      createComponentFunction(structure.id, [
        ...wireVisualComponentsToReactComponents(flatComponentList, vcl),
        writeComponentProperties(flatComponentList),
        writeComponentEvents(flatComponentList, vcl),
        writeScope(flatComponentList, vcl),

        f.createReturnStatement(
          f.createParenthesizedExpression(
            writeCompositionTree(structure.composition, flatComponentList, vcl),
          ),
        ),
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
