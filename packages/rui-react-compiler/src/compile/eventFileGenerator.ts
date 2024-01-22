import ts from "typescript";
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

export const generateScopedHandlers = (
  interfaceFile,
  configuration,
): [ts.ExportAssignment, imports: string[]] => {
  const [properties, dependencies] = generateHandlerFunctions(
    interfaceFile,
    configuration,
  );

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
          f.createTypeReferenceNode(f.createIdentifier("Scope"), undefined),
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
    ts.isArrowFunction(defaultExport.expression)
  ) {
    const scopeArg = defaultExport.expression.parameters.at(0);
    if (scopeArg && scopeArg.type && ts.isTypeReferenceNode(scopeArg.type)) {
      return scopeArg.type.typeName.getText();
    }
  }
  return "Scope";
};

export const synchronizeLogicFile = async (
  sourceFile: ts.SourceFile,
  interfaceFile,
  configuration: Config,
): Promise<[hasChanges: boolean, newCode: string]> => {
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

  let madeChanges = false;

  const scopeTypeName = getScopeTypeName(sourceFile);

  const transformerFactory: ts.TransformerFactory<ts.Node> = (
    context: ts.TransformationContext,
  ) => {
    return (rootNode) => {
      function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);

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
        if (ts.isSourceFile(node)) {
          if (dependencies.length > 0) {
            madeChanges = true;

            const newStatements = [
              ...dependenciesToTS(dependencies),
              ...node.statements,
            ];

            dependencies = [];

            return f.createSourceFile(
              newStatements,
              f.createToken(ts.SyntaxKind.EndOfFileToken),
              node.flags,
            );
          }
        }

        return node;
      }

      return ts.visitNode(rootNode, visit);
    };
  };

  // const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const transformationResult = ts.transform(sourceFile, [transformerFactory]);
  const printer = ts.createPrinter();

  const code = printer.printNode(
    ts.EmitHint.SourceFile,
    transformationResult.transformed[0],
    sourceFile,
  );
  console.log(madeChanges, code);

  return [madeChanges, ""];
};
