import ts from "typescript";
import { collectDependencies, selectAll } from "./typescript/selectAll";

const s = ts.SyntaxKind;
const exportSelector = [s.ExportAssignment, s.ArrowFunction] as const;
const propertyChainSelector = [
  s.ParenthesizedExpression,
  s.ObjectLiteralExpression,
  s.PropertyAssignment,
] as const;

export const buildHandlers = (
  sourceFile: ts.SourceFile,
  program: ts.Program,
): LogicBlocks => {
  const result: LogicBlocks = {};
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
    const dependencies = collectDependencies(handler.initializer, typeChecker);

    result[handlerName] = {
      code: handlerCode,
      dependencies,
    };
  });
  return result;
};

export type LogicBlocks = Record<string, Logic>;

export type Logic = {
  code: string;
  dependencies: string[];
};

export type LogicMap = {
  map: Record<string, string>;
  dependencies: string[];
};

export const emptyLogicMap = (): LogicMap => ({ map: {}, dependencies: [] });
