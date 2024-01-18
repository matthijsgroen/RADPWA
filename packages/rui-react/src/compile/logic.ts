import * as ts from "typescript";

const s = ts.SyntaxKind;
const selector = [
  s.ExportAssignment,
  s.ArrowFunction,
  s.ParenthesizedExpression,
  s.ObjectLiteralExpression,
  s.PropertyAssignment,
];

const selectAll = (nodes: ts.Node[], selector: ts.SyntaxKind[]): ts.Node[] => {
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
    return found;
  }
  return selectAll(found, rest);
};

type FilterResult = { start: number; end: number };
const filterScope = (node: ts.Node): FilterResult[] => {
  const result: FilterResult[] = [];
  if (ts.isPropertyAccessExpression(node)) {
    if (
      ts.isIdentifier(node.expression) &&
      node.expression.escapedText === "scope"
    ) {
      result.push({ start: node.expression.pos, end: node.expression.end });
    }
  }

  ts.forEachChild(
    node,
    (child) => result.push(...filterScope(child)),
    (embedded) => {
      embedded.forEach((child) => result.push(...filterScope(child)));
      return undefined;
    },
  );
  return result;
};

export const buildHandlers = (
  sourceFile: ts.SourceFile,
): Record<string, string> => {
  const result: Record<string, string> = {};
  const handlers = selectAll([sourceFile], selector) as ts.PropertyAssignment[];

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  handlers.forEach((handler) => {
    const handlerName = `${(handler.name as ts.Identifier).escapedText}`;

    const filterResult = filterScope(handler.initializer)
      .map((f) => ({
        start: f.start - handler.initializer.pos,
        end: f.end - handler.initializer.pos,
      }))
      .sort((a, b) => b.start - a.start);

    const handlerCode = printer.printNode(
      ts.EmitHint.Unspecified,
      handler.initializer,
      sourceFile,
    );

    const filteredCode = filterResult.reduce((code, filter) => {
      return code.slice(0, filter.start) + code.slice(filter.end);
    }, handlerCode);
    result[handlerName] = filteredCode;
  });
  return result;
};
