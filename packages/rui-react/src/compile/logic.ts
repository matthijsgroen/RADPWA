import * as ts from "typescript";

const s = ts.SyntaxKind;
const exportSelector = [s.ExportAssignment, s.ArrowFunction] as const;
const propertyChainSelector = [
  s.ParenthesizedExpression,
  s.ObjectLiteralExpression,
  s.PropertyAssignment,
] as const;

const selectAll = <R extends ts.Node>(
  nodes: ts.Node[],
  selector: readonly [...ts.SyntaxKind[], R["kind"]],
): R[] => {
  const [first, ...rest] = selector;

  const found: ts.Node[] = [];
  nodes.forEach((node) =>
    ts.forEachChild(node, (child) => {
      if (child.kind === first) {
        found.push(child);
      }
    }),
  );

  if (rest.length === 0 || found.length === 0) {
    return found as R[];
  }
  return selectAll(found, rest as [...ts.SyntaxKind[], R["kind"]]);
};

export const buildHandlers = (
  sourceFile: ts.SourceFile,
  program: ts.Program,
): Record<string, string> => {
  const result: Record<string, string> = {};
  const scopedHandlers = selectAll<ts.ArrowFunction>(
    [sourceFile],
    exportSelector,
  )[0];

  const typeChecker = program.getTypeChecker();
  const definedScope = scopedHandlers.parameters[0];

  const isScope = (identifier: ts.Identifier) => {
    const symbol = typeChecker.getSymbolAtLocation(identifier);
    return symbol?.declarations?.includes(definedScope) ?? false;
  };

  const transformerFactory: ts.TransformerFactory<ts.Node> = (
    context: ts.TransformationContext,
  ) => {
    return (rootNode) => {
      function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);

        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          isScope(node.expression)
        ) {
          return node.name;
        } else {
          return node;
        }
      }

      return ts.visitNode(rootNode, visit);
    };
  };

  const handlers = selectAll<ts.PropertyAssignment>(
    [scopedHandlers],
    propertyChainSelector,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  handlers.forEach((handler) => {
    const handlerName = ts.isIdentifier(handler.name)
      ? `${handler.name.escapedText}`
      : "unknown";
    const transformationResult = ts.transform(handler.initializer, [
      transformerFactory,
    ]);

    const handlerCode = printer.printNode(
      ts.EmitHint.Unspecified,
      transformationResult.transformed[0],
      sourceFile,
    );

    result[handlerName] = handlerCode;
  });
  return result;
};
