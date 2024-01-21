import ts from "typescript";
import prettier from "prettier";

import {
  buildDependencies,
  dependencyToCode,
  stringToDependency,
} from "./dependencies";
import { selectAll } from "./ts-select";
import { buildDataComponentModel } from "./dataComponent";

const f = ts.factory;

const extractUsedDependencies = (code: ts.Node, dependencies: string[]) => {
  const deps = dependencies.map((d) => stringToDependency(d));
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
            usedDependencies.push(dependencies[depIndex]);
          }
        }
        visit(child);
      },
      (nodes) => {
        nodes.forEach((node) => visit(node));
      },
    );

  visit(code);
  return usedDependencies;
};

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

export const generateLogicFile = async (interfaceFile, configuration) => {
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
