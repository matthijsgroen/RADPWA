import ts from "typescript";
import prettier from "prettier";

import {
  buildDependencies,
  dependencyToCode,
  stringToDependency,
} from "./dependencies";
import { collectDependencies, selectAll } from "./ts-select";
import { buildDataComponentModel } from "./dataComponent";

const f = ts.factory;

const createScopeItem = (item: {
  name: string;
  type: string;
  dependencies: string[];
}): [ts.PropertySignature, string[]] => {
  const tempScript = [
    ...item.dependencies.map((s) => dependencyToCode(stringToDependency(s))),
    `type Temp = ${item.type};`,
  ];

  const file = ts.createSourceFile(
    "f.ts",
    tempScript.join("\n"),
    ts.ScriptTarget.Latest,
  );

  const typeDeclaration = selectAll<ts.TypeAliasDeclaration>([file], [
    ts.SyntaxKind.TypeAliasDeclaration,
  ] as const)[0].type;

  const deps = item.dependencies.map((d) => stringToDependency(d));

  const usedDependencies: string[] = [];

  const visit = (node: ts.Node) =>
    ts.forEachChild(
      node,
      (child) => {
        if (ts.isIdentifier(child)) {
          const depIndex = deps.findIndex(
            (d) =>
              d.defaultImport === child.escapedText ||
              d.namedImports.find((i) => i.name === child.escapedText),
          );
          if (depIndex !== -1) {
            usedDependencies.push(item.dependencies[depIndex]);
          }
        }
        visit(child);
      },
      (nodes) => {
        nodes.forEach((node) => visit(node));
      },
    );

  visit(typeDeclaration);

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

export const generateHandlerFunctions = (
  interfaceFile,
  configuration,
): [ts.ExportAssignment, imports: string[]] => {
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
      f.createParenthesizedExpression(f.createObjectLiteralExpression([])),
    ),
  );

  return [scopedFunctions, []];
};

export const generateLogicFile = async (interfaceFile, configuration) => {
  const [scope, scopeImports] = createScopeType(interfaceFile, configuration);
  const [functions, funcImports] = generateHandlerFunctions(
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
