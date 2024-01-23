import ts, {
  Identifier,
  NodeArray,
  PropertyAssignment,
  PropertySignature,
  SyntaxKind,
  TypeLiteralNode,
} from "typescript";
import prettier from "prettier";
import {
  Dependency,
  buildDependencies,
  dependenciesToTS,
  dependencyToCode,
  mergeDependencies,
  namedImportToTS,
  stringToDependency,
} from "./dependencies";
import { selectAll } from "./typescript/selectAll";
import { buildDataComponentModel } from "./dataComponent";
import { extractUsedDependencies } from "./typescript/extractUsedDependencies";
import { Config } from "../Config";
import { transferComments } from "./typescript/comments";

const f = ts.factory;

const extractTypeDeclaration = (
  type: string,
  dependencies: string[],
): [ts.TypeNode, string[]] => {
  const tempScript = [
    ...dependencies.map((s) => dependencyToCode(stringToDependency(s))),
    `type Temp = ${type};`,
  ];

  const file = ts.createSourceFile(
    "f.ts",
    tempScript.join("\n"),
    ts.ScriptTarget.Latest,
  );

  const typeDeclaration = selectAll<ts.TypeAliasDeclaration>([file], [
    ts.SyntaxKind.TypeAliasDeclaration,
  ] as const)[0].type;

  const usedDependencies = extractUsedDependencies(
    typeDeclaration,
    dependencies,
  );

  return [typeDeclaration, usedDependencies];
};

const createScopeItem = (item: {
  name: string;
  type: string;
  dependencies: string[];
}): [ts.PropertySignature, string[]] => {
  const [typeDeclaration, usedDependencies] = extractTypeDeclaration(
    item.type,
    item.dependencies,
  );
  const signature = f.createPropertySignature(
    [f.createToken(ts.SyntaxKind.ReadonlyKeyword)],
    f.createIdentifier(item.name),
    undefined,
    typeDeclaration,
  );

  return [signature, usedDependencies];
};

export const createScopeType = (
  interfaceFile,
  configuration,
): [ts.TypeAliasDeclaration, string[]] => {
  const items: ts.TypeElement[] = [];
  const imports: string[] = [];

  const produced = interfaceFile.components.reduce((result, item) => {
    const componentDefinition = configuration.components.find(
      (c) => c.name === item.component,
    );
    if (!componentDefinition || componentDefinition.produces === undefined) {
      return result;
    }
    const [model, dependencies] = buildDataComponentModel(
      item,
      componentDefinition,
      {},
    );

    const type = componentDefinition.produces(model);

    return result.concat({
      name: item.id,
      type,
      dependencies,
    });
  }, []);

  produced.forEach((item) => {
    const [scopeItem, importStatement] = createScopeItem(item);

    items.push(scopeItem);
    imports.push(...importStatement);
  });

  const scope = f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("Scope"),
    undefined,
    f.createTypeLiteralNode(items),
  );

  return [scope, imports];
};

const collectHandlers = (interfaceFile, configuration) => {
  const handlers: {
    name: string;
    returnType: string;
    parameters: [name: string, type: string][];
    dependencies: string[];
  }[] = [];

  const extractHandlersFromComponent = (component) => {
    const componentDefinition = configuration.components.find(
      (c) => c.name === component.component,
    );
    if (!componentDefinition) {
      throw new Error(`Component definition for ${component} not found`);
    }
    (
      Object.entries(component?.events ?? {}) as [string, { value: string }][]
    ).forEach(([eventName, eventDetails]) => {
      const signature = componentDefinition.events[eventName];

      handlers.push({
        name: eventDetails.value,
        returnType: signature.returnType,
        parameters: signature.parameters,
        dependencies: componentDefinition.dependencies,
      });
    });

    const containerNames =
      componentDefinition.childContainers ??
      (componentDefinition.allowChildren ? ["children"] : []);

    containerNames.forEach((c) => {
      (component[c] ?? []).forEach((child) => {
        if (typeof child === "string") {
          return child;
        }
        extractHandlersFromComponent(child);
      });
    });
  };

  interfaceFile.components.forEach((component) => {
    extractHandlersFromComponent(component);
  });

  interfaceFile.children.forEach((component) => {
    extractHandlersFromComponent(component);
  });

  return handlers;
};

export const generateHandlerFunctions = (
  interfaceFile,
  configuration,
): [ts.PropertyAssignment[], imports: string[]] => {
  const requiredHandlers = collectHandlers(interfaceFile, configuration);

  const codeFragments = requiredHandlers.map(
    (handler) => `${buildDependencies(handler.dependencies)}
      const ${handler.name} = (${handler.parameters.map(([n, t]) => `${n}: ${t}`).join(", ")}): ${handler.returnType} => {}
    `,
  );

  const dependencies: string[] = [];

  const handlerFunctions = codeFragments.map((code, idx) => {
    const file = ts.createSourceFile("f.ts", code, ts.ScriptTarget.Latest);
    const deps = requiredHandlers[idx].dependencies;

    const functionDeclaration = selectAll<ts.ArrowFunction>([file], [
      ts.SyntaxKind.VariableStatement,
      ts.SyntaxKind.VariableDeclarationList,
      ts.SyntaxKind.VariableDeclaration,
      ts.SyntaxKind.ArrowFunction,
    ] as const)[0];

    const usedDependencies = extractUsedDependencies(functionDeclaration, deps);
    dependencies.push(...usedDependencies);

    return f.createPropertyAssignment(
      requiredHandlers[idx].name,
      functionDeclaration,
    );
  });

  return [handlerFunctions, dependencies];
};

export const wrapScopedHandlers = (
  scopeTypeName: string,
  properties: ts.PropertyAssignment[],
): ts.ExportAssignment => {
  const scopedFunctions = f.createExportAssignment(
    undefined,
    undefined,
    f.createArrowFunction(
      undefined,
      undefined,
      [
        f.createParameterDeclaration(
          undefined,
          undefined,
          f.createIdentifier("scope"),
          undefined,
          f.createTypeReferenceNode(
            f.createIdentifier(scopeTypeName),
            undefined,
          ),
          undefined,
        ),
      ],
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createParenthesizedExpression(
        f.createObjectLiteralExpression(properties),
      ),
    ),
  );

  return scopedFunctions;
};

export const generateScopedHandlers = (
  interfaceFile,
  configuration: Config,
): [ts.ExportAssignment, imports: string[]] => {
  const [properties, dependencies] = generateHandlerFunctions(
    interfaceFile,
    configuration,
  );
  const scopedFunctions = wrapScopedHandlers("Scope", properties);

  return [scopedFunctions, dependencies];
};

export const generateLogicFile = async (
  interfaceFile,
  configuration: Config,
) => {
  const [scope, scopeImports] = createScopeType(interfaceFile, configuration);
  const [functions, funcImports] = generateScopedHandlers(
    interfaceFile,
    configuration,
  );

  const printer = ts.createPrinter();

  const importCode = buildDependencies(scopeImports.concat(funcImports));

  const scopeCode = printer.printNode(
    ts.EmitHint.Unspecified,
    scope,
    ts.createSourceFile("", "", ts.ScriptTarget.Latest),
  );

  const functionCode = printer.printNode(
    ts.EmitHint.Unspecified,
    functions,
    ts.createSourceFile("", "", ts.ScriptTarget.Latest),
  );

  const completeCode = await prettier.format(
    `
  ${importCode}

  ${scopeCode}

  ${functionCode}
  `,
    { parser: "typescript" },
  );

  return completeCode;
};

const getScopeTypeName = (sourceFile: ts.SourceFile): string => {
  const defaultExport = sourceFile.statements.find((v) =>
    ts.isExportAssignment(v),
  );
  if (
    defaultExport &&
    ts.isExportAssignment(defaultExport) &&
    defaultExport.expression &&
    ts.isArrowFunction(defaultExport.expression)
  ) {
    const scopeArg = defaultExport.expression.parameters.at(0);
    if (scopeArg && scopeArg.type && ts.isTypeReferenceNode(scopeArg.type)) {
      return scopeArg.type.typeName.getText();
    }
  }
  return "Scope";
};

const stringifyPropertyMember = (
  property: ts.PropertySignature,
  sourceFile: ts.SourceFile,
  printer: ts.Printer,
): string =>
  printer.printNode(
    ts.EmitHint.Unspecified,
    f.createTypeAliasDeclaration(
      undefined,
      "test",
      undefined,
      property.type as ts.TypeNode,
    ),
    sourceFile,
  );

const stringifyArrowFunction = (
  arrow: ts.ArrowFunction,
  sourceFile: ts.SourceFile,
  printer: ts.Printer,
): string =>
  printer.printNode(
    ts.EmitHint.Unspecified,
    f.createVariableDeclaration(
      "test",
      undefined,
      undefined,
      f.createArrowFunction(
        undefined,
        undefined,
        arrow.parameters,
        arrow.type,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock([]),
      ),
    ),
    sourceFile,
  );

const isSignatureEqual = <T extends PropertyAssignment | PropertySignature>(
  source: T,
  target: T,
  sourceFile: ts.SourceFile,
  printer: ts.Printer,
) => {
  if (ts.isPropertySignature(source) && ts.isPropertySignature(target)) {
    const actualType = stringifyPropertyMember(source, sourceFile, printer);
    const expectedType = stringifyPropertyMember(target, sourceFile, printer);
    return actualType === expectedType;
  }

  if (
    ts.isPropertyAssignment(source) &&
    ts.isPropertyAssignment(target) &&
    ts.isArrowFunction(source.initializer) &&
    ts.isArrowFunction(target.initializer)
  ) {
    const actualType = stringifyArrowFunction(
      source.initializer,
      sourceFile,
      printer,
    );
    const expectedType = stringifyArrowFunction(
      target.initializer,
      sourceFile,
      printer,
    );
    return actualType === expectedType;
  }

  return false;
};

const synchronizeProperties = <
  K extends ts.PropertyAssignment | ts.PropertySignature,
  T extends NodeArray<K>,
>(
  source: T,
  target: T,
  addComments: <N extends ts.Node>(node: N) => N,
  sourceFile: ts.SourceFile,
  printer: ts.Printer,
  keepOutdated = false,
): [updated: boolean, result: T] => {
  let updatedScopeType = false;
  let missingMembers = target.map((e) => {
    if (ts.isIdentifier(e.name)) {
      return e.name.text;
    }
  });

  const updatedMembers: K[] = [];
  source.forEach((member) => {
    if (ts.isIdentifier(member.name)) {
      const name = member.name.text;
      const expectedMember = target.find(
        (m) => ts.isIdentifier(m.name) && m.name.text === name,
      );
      if (!expectedMember) {
        if (keepOutdated) {
          // member is not required anymore, but we keep it
          updatedMembers.push(addComments(member));
        }

        updatedScopeType = true;
        return;
      }
      const equalSignature =
        keepOutdated ||
        isSignatureEqual(member, expectedMember, sourceFile, printer);

      if (equalSignature) {
        // we keep original code.. are comments included?
        updatedMembers.push(addComments(member));

        missingMembers = missingMembers.filter((n) => n !== name);
      } else {
        updatedScopeType = true;
      }
      // verify type
    } else {
      updatedScopeType = true;
    }
  });

  return [
    updatedScopeType || missingMembers.length > 0,
    f.createNodeArray([
      ...updatedMembers,
      ...missingMembers.map<K>(
        (f) =>
          target.find(
            (expected) => (expected.name as Identifier).text === f,
          ) as K,
      ),
    ]) as T,
  ];
};

export const synchronizeLogicFile = async (
  sourceFile: ts.SourceFile,
  interfaceFile,
  configuration: Config,
): Promise<[hasChanges: boolean, newCode: string]> => {
  // Create all sources to synchronize
  const [scope, scopeImports] = createScopeType(interfaceFile, configuration);
  const [properties, funcImports] = generateHandlerFunctions(
    interfaceFile,
    configuration,
  );

  let dependencies = mergeDependencies(
    scopeImports
      .concat(funcImports)
      .map((statement) => stringToDependency(statement)),
  );

  const printer = ts.createPrinter({ removeComments: false });

  const commentAdministration: { comments: ts.CommentRange[] } = {
    comments: [],
  };
  const addComments = <T extends ts.Node>(source: T, destination: T = source) =>
    transferComments(source, destination, sourceFile, commentAdministration);

  let madeChanges = false;

  const scopeTypeName = getScopeTypeName(sourceFile);

  let foundScope = false;
  let foundExport = false;

  const existingFunctionHandlers = selectAll<ts.ObjectLiteralExpression>(
    [sourceFile],
    [
      ts.SyntaxKind.ExportAssignment,
      ts.SyntaxKind.ArrowFunction,
      ts.SyntaxKind.ParenthesizedExpression,
      ts.SyntaxKind.ObjectLiteralExpression,
    ],
  )[0];

  const transformerFactory: ts.TransformerFactory<ts.Node> =
    (context: ts.TransformationContext) => (rootNode) => {
      function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);

        /**
         * Dependencies
         */
        if (ts.isImportSpecifier(node)) {
          const specifier = node;
          const module = specifier.parent.parent.parent.moduleSpecifier
            .getText()
            .slice(1, -1);

          dependencies = dependencies.reduce<Dependency[]>((result, item) => {
            if (item.module === module) {
              const remaining = item.namedImports.filter(
                (i) => i.name !== specifier.name.text,
              );
              // TODO: Add support for default import
              if (remaining.length === 0) {
                return result;
              }
              if (remaining.length < item.namedImports.length) {
                return result.concat({
                  ...item,
                  namedImports: remaining,
                });
              }
            }
            return result.concat(item);
          }, []);
        }

        /**
         * Dependencies
         */
        if (ts.isNamedImports(node)) {
          const namedCollection = node;
          const module = namedCollection.parent.parent.moduleSpecifier
            .getText()
            .slice(1, -1);

          const moduleRep = dependencies.find((d) => d.module === module);
          if (moduleRep) {
            madeChanges = true;
            const missingNamed = namedImportToTS(moduleRep.namedImports);
            // TODO: Add support for default imports
            dependencies = dependencies.filter((d) => d !== moduleRep);
            return f.createNamedImports([...node.elements, ...missingNamed]);
          }
        }

        /**
         * Scope type object
         */
        if (
          ts.isTypeAliasDeclaration(node) &&
          node.name.text === scopeTypeName
        ) {
          foundScope = true;

          if (ts.isTypeLiteralNode(node.type)) {
            const existingMembers = node.type
              .members as NodeArray<PropertySignature>;
            const expectedMembers = (scope.type as TypeLiteralNode)
              .members as NodeArray<PropertySignature>;

            const [updatedMembers, newMembers] = synchronizeProperties(
              existingMembers,
              expectedMembers,
              addComments,
              sourceFile,
              printer,
            );

            if (updatedMembers) {
              return addComments(
                node,
                f.createTypeAliasDeclaration(
                  undefined,
                  scopeTypeName,
                  undefined,
                  f.createTypeLiteralNode(newMembers),
                ),
              );
            }
          } else {
            return addComments(
              node,
              f.createTypeAliasDeclaration(
                undefined,
                f.createIdentifier(scopeTypeName),
                undefined,
                scope.type,
              ),
            );
          }
        }

        if (ts.isExportAssignment(node)) {
          foundExport = true;
        }

        if (
          ts.isObjectLiteralExpression(node) &&
          existingFunctionHandlers &&
          node.pos === existingFunctionHandlers.pos &&
          node.end === existingFunctionHandlers.end
        ) {
          // function handlers ? first check if this object literal expression is the body of the exported arrow function
          // Synchronize property assignments
          const existingMembers =
            node.properties as NodeArray<PropertyAssignment>;
          const expectedMembers = f.createNodeArray(properties);

          const [updatedMembers, newMembers] = synchronizeProperties(
            existingMembers,
            expectedMembers,
            addComments,
            sourceFile,
            printer,
            true, // Keep outdated
          );

          if (updatedMembers) {
            madeChanges = true;
            return addComments(
              node,
              f.createObjectLiteralExpression(newMembers),
            );
          }
        }

        /**
         * Root for missing dependencies, injection missing scope
         */
        if (ts.isSourceFile(node)) {
          if (dependencies.length > 0 || !foundScope) {
            madeChanges = true;

            const newStatements = [
              ...dependenciesToTS(dependencies),
              ...(foundScope
                ? []
                : [
                    f.createTypeAliasDeclaration(
                      undefined,
                      f.createIdentifier(scopeTypeName),
                      undefined,
                      scope.type,
                    ),
                  ]),
              ...node.statements,
              ...(foundExport
                ? []
                : [wrapScopedHandlers(scopeTypeName, properties)]),
            ];

            dependencies = [];

            return f.createSourceFile(
              newStatements,
              f.createToken(ts.SyntaxKind.EndOfFileToken),
              node.flags,
            );
          }
        }

        return addComments(node);
      }

      return ts.visitNode(rootNode, visit);
    };

  const transformationResult = ts.transform(sourceFile, [transformerFactory], {
    removeComments: false,
  });

  if (madeChanges) {
    const code = await prettier.format(
      printer.printNode(
        ts.EmitHint.SourceFile,
        transformationResult.transformed[0],
        sourceFile,
      ),
      { parser: "typescript" },
    );
    console.log(madeChanges, code);
    return [madeChanges, code];
  }

  return [madeChanges, ""];
};
