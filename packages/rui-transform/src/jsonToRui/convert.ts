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
  RuiTypeDeclaration,
  RuiVisualComponent,
} from "../compiler-types";
import { capitalize } from "../string-utils";
import { convertValue } from "../value-utils";
import { isVisualComponent } from "../type-utils";

const getFlatComponentList = (
  structure: RuiJSONFormat,
  flattenDataComponents = false,
): (RuiDataComponent | RuiVisualComponent)[] => {
  const result: (RuiDataComponent | RuiVisualComponent)[] = [];

  const pushNestedComponents = (
    nodes: (RuiVisualComponent | RuiDataComponent)[],
  ) => {
    result.push(...nodes);
    nodes.forEach((node) => {
      Object.entries(node.childContainers || {}).forEach(([_k, v]) => {
        pushNestedComponents(v);
      });
    });
  };

  if (flattenDataComponents) {
    pushNestedComponents(structure.components);
  } else {
    result.push(...structure.components);
  }

  pushNestedComponents(structure.composition);
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
      false,
      undefined,
      f.createNamedImports([
        f.createImportSpecifier(
          true,
          undefined,
          f.createIdentifier("EventsOf"),
        ),
        f.createImportSpecifier(
          true,
          undefined,
          f.createIdentifier("PropertiesOf"),
        ),
        f.createImportSpecifier(
          false,
          undefined,
          f.createIdentifier("exposePropsAsState"),
        ),
        f.createImportSpecifier(
          false,
          undefined,
          f.createIdentifier("composeDataChildren"),
        ),
      ]),
    ),
    f.createStringLiteral("@rui/transform"),
    undefined,
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

const defineComponentTypes = () => [
  f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("CL"),
    undefined,
    f.createTypeQueryNode(f.createIdentifier("Components"), undefined),
  ),
  f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("CProps"),
    [
      f.createTypeParameterDeclaration(
        undefined,
        f.createIdentifier("TComponentName"),
        f.createTypeOperatorNode(
          ts.SyntaxKind.KeyOfKeyword,
          f.createTypeReferenceNode(f.createIdentifier("CL"), undefined),
        ),
        undefined,
      ),
    ],
    f.createTypeReferenceNode(f.createIdentifier("Partial"), [
      f.createTypeReferenceNode(f.createIdentifier("PropertiesOf"), [
        f.createIndexedAccessTypeNode(
          f.createTypeReferenceNode(f.createIdentifier("CL"), undefined),
          f.createTypeReferenceNode(
            f.createIdentifier("TComponentName"),
            undefined,
          ),
        ),
      ]),
    ]),
  ),
  f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("CEvents"),
    [
      f.createTypeParameterDeclaration(
        undefined,
        f.createIdentifier("TComponentName"),
        f.createTypeOperatorNode(
          ts.SyntaxKind.KeyOfKeyword,
          f.createTypeReferenceNode(f.createIdentifier("CL"), undefined),
        ),
        undefined,
      ),
    ],
    f.createTypeReferenceNode(f.createIdentifier("Partial"), [
      f.createTypeReferenceNode(f.createIdentifier("EventsOf"), [
        f.createIndexedAccessTypeNode(
          f.createTypeReferenceNode(f.createIdentifier("CL"), undefined),
          f.createTypeReferenceNode(
            f.createIdentifier("TComponentName"),
            undefined,
          ),
        ),
      ]),
    ]),
  ),
];

export const mergeType = (
  ...items: (ts.TypeNode | undefined)[]
): ts.TypeNode => {
  const intersection: ts.TypeNode[] = [];

  for (const item of items) {
    if (item !== undefined) {
      if (ts.isTypeLiteralNode(item)) {
        const existingLiteral = intersection.findIndex((e) =>
          ts.isTypeLiteralNode(e),
        );
        if (existingLiteral !== -1) {
          const existingNode = intersection[existingLiteral];
          const propSignatures = ts.isTypeLiteralNode(existingNode)
            ? existingNode.members
            : f.createNodeArray<ts.PropertySignature>([]);

          intersection[existingLiteral] = f.createTypeLiteralNode(
            propSignatures.concat(item.members),
          );
        }
      }

      intersection.push(item);
    }
  }

  if (intersection.length === 0) {
    return f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
  if (intersection.length === 1) {
    return intersection[0];
  }
  return f.createIntersectionTypeNode(intersection);
};

const componentAsType = (
  c: RuiDataComponent | RuiVisualComponent,
  vcl: ComponentLibraryMetaInformation,
): ts.TypeNode => {
  const type = vcl[c.component].produces?.type;
  const propsAsStateType = c.propsAsState
    ? f.createTypeLiteralNode(
        c.propsAsState.map((prop) =>
          f.createPropertySignature(
            undefined,
            prop,
            f.createToken(ts.SyntaxKind.QuestionToken),
            vcl[c.component].properties[prop].type,
          ),
        ),
      )
    : undefined;
  const childComponents = c.childContainers
    ? f.createTypeLiteralNode(
        Object.entries(c.childContainers).map(([k, v]) =>
          f.createPropertySignature(
            [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
            k,
            undefined,
            f.createTypeLiteralNode(
              v.map((c) =>
                f.createPropertySignature(
                  [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
                  c.id,
                  undefined,
                  componentAsType(c, vcl),
                ),
              ),
            ),
          ),
        ),
      )
    : undefined;

  return mergeType(type, propsAsStateType, childComponents);
};

const createType = (typeString: string): ts.TypeNode => {
  if (typeString === "string") {
    return f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  }
  if (typeString === "number") {
    return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  }
  if (typeString === "boolean") {
    return f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  }

  if (typeString === "unknown") {
    return f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }

  return f.createTypeReferenceNode(f.createIdentifier(typeString), undefined);
};

const defineInterface = (
  componentInterface: Record<string, RuiTypeDeclaration>,
): ts.Statement =>
  f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("Props"),
    undefined,
    f.createTypeLiteralNode(
      Object.entries(componentInterface).map(([key, value]) =>
        f.createPropertySignature(
          [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
          f.createIdentifier(key),
          value.optional
            ? f.createToken(ts.SyntaxKind.QuestionToken)
            : undefined,
          createType(value.type),
        ),
      ),
    ),
  );

export const defineScopeType = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: ComponentLibraryMetaInformation,
  hasProps: boolean,
) => {
  const hasPropsAsState = (c: RuiDataComponent | RuiVisualComponent) =>
    "propsAsState" in c && (c.propsAsState?.length ?? 0) > 0;

  const producesResultType = (c: RuiDataComponent | RuiVisualComponent) =>
    c.component && vcl[c.component] && vcl[c.component].produces !== undefined;

  const scopeType = f.createTypeLiteralNode(
    flatComponentList
      .filter((c) => hasPropsAsState(c) || producesResultType(c))
      .map((c) =>
        f.createPropertySignature(
          [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
          c.id,
          undefined,
          componentAsType(c, vcl),
        ),
      ),
  );
  return f.createTypeAliasDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    "Scope",
    undefined,
    hasProps
      ? f.createIntersectionTypeNode([
          scopeType,
          f.createTypeReferenceNode("Props"),
        ])
      : scopeType,
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
  members: ts.ObjectLiteralElementLike[],
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
              Object.entries(component.props || {})
                .map<ts.PropertyAssignment | undefined>(([k, v]) => {
                  const value = convertValue(v);

                  return value
                    ? f.createPropertyAssignment(f.createIdentifier(k), value)
                    : undefined;
                })
                .filter(
                  (item): item is ts.PropertyAssignment => item !== undefined,
                ),
              true,
            ),
            f.createTypeReferenceNode(f.createIdentifier("CProps"), [
              f.createLiteralTypeNode(
                f.createStringLiteral(component.component),
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
            f.createTypeReferenceNode(f.createIdentifier("CEvents"), [
              f.createLiteralTypeNode(
                f.createStringLiteral(component.component),
              ),
            ]),
          ),
        ),
      ),
  );

const createComponentFunction = (
  name: string,
  hasProps: boolean,
  statements: ts.Statement[],
) =>
  f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          f.createIdentifier(name),
          undefined,
          f.createTypeReferenceNode(
            f.createQualifiedName(
              f.createIdentifier("React"),
              f.createIdentifier("FC"),
            ),
            hasProps
              ? [
                  f.createTypeReferenceNode(
                    f.createIdentifier("Props"),
                    undefined,
                  ),
                ]
              : [],
          ),
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
          f.createAsExpression(
            f.createPropertyAccessExpression(
              f.createIdentifier("properties"),
              f.createIdentifier(capitalize(component.id)),
            ),
            f.createTypeReferenceNode(f.createIdentifier("CProps"), [
              f.createLiteralTypeNode(
                f.createStringLiteral(component.component),
              ),
            ]),
          ),
          ...(component.propsAsState ?? []).map((p) =>
            f.createStringLiteral(p),
          ),
        ],
      )
    : contents;

const wrapWithDataChildContainers = (
  component: RuiDataComponent | RuiVisualComponent,
  vcl: ComponentLibraryMetaInformation,
  contents: ts.Expression,
): ts.Expression => {
  if (component.childContainers) {
    return f.createCallExpression(
      f.createIdentifier("composeDataChildren"),
      undefined,
      [
        contents,
        f.createObjectLiteralExpression(
          Object.entries(component.childContainers).map(([k, v]) =>
            f.createPropertyAssignment(
              k,
              f.createObjectLiteralExpression(
                v.map((child) => createDataComponent(child, vcl)),
              ),
            ),
          ),
        ),
      ],
    );
  }
  return contents;
};

const createDataComponent = (
  c: RuiDataComponent | RuiVisualComponent,
  vcl: ComponentLibraryMetaInformation,
): ts.PropertyAssignment => {
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
    wrapWithDataChildContainers(
      c,
      vcl,
      wrapWithPropsAsState(c, vcl, production),
    ),
  );
};

const writeScope = (
  flatComponentList: (RuiDataComponent | RuiVisualComponent)[],
  vcl: ComponentLibraryMetaInformation,
  hasProps: boolean,
) =>
  writeConstObject(
    "scope",
    "Scope",
    (hasProps
      ? [f.createSpreadAssignment(f.createIdentifier("props"))]
      : ([] as ts.PropertyAssignment[])
    ).concat(
      ...flatComponentList
        .filter((c) => vcl[c.component].produces || hasPropsAsState(c, vcl))
        .map((c) => createDataComponent(c, vcl)),
    ),
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

  Object.entries(node.props || {})
    .filter(
      (v): v is [string, { ref: string }] =>
        typeof v[1] === "object" && "ref" in v[1],
    )
    .forEach(([k, v]) => {
      attributes.push(
        f.createJsxAttribute(
          f.createIdentifier(k),
          f.createJsxExpression(
            undefined,
            f.createPropertyAccessChain(
              f.createIdentifier("scope"),
              undefined,
              f.createIdentifier(v.ref),
            ),
          ),
        ),
      );
    });

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

export const convertJsonToRui = (
  structure: RuiJSONFormat,
  vcl: ComponentLibraryMetaInformation,
): Promise<string> => {
  const printer = ts.createPrinter();

  const visualFlatComponentList = getFlatComponentList(structure);
  const fullFlatComponentList = getFlatComponentList(structure, true);
  const missingComponents = fullFlatComponentList
    .map((c) => c.component)
    .filter((c) => !vcl[c]);

  if (missingComponents.length > 0) {
    throw new Error(
      `Defined components are missing from the library: ${missingComponents.join(", ")}`,
    );
  }
  const hasProps = Object.keys(structure.interface).length > 0;

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
      ...defineComponentTypes(),
      defineInterface(structure.interface),
      defineScopeType(visualFlatComponentList, vcl, hasProps),
      createComponentFunction(structure.id, hasProps, [
        ...wireVisualComponentsToReactComponents(visualFlatComponentList, vcl),
        writeComponentProperties(fullFlatComponentList),
        writeComponentEvents(fullFlatComponentList, vcl),
        writeScope(visualFlatComponentList, vcl, hasProps),

        f.createReturnStatement(
          f.createParenthesizedExpression(
            writeCompositionTree(
              structure.composition,
              visualFlatComponentList,
              vcl,
            ),
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
