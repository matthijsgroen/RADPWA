import ts, { factory as f } from "typescript";

export const convertValue = (v: unknown) => {
  if (typeof v === "string") {
    return f.createStringLiteral(v);
  }
  if (v === false) {
    return f.createFalse();
  }
  if (v === true) {
    return f.createTrue();
  }

  return undefined;
};

type JSON = null | string | number | boolean | JSON[] | Record<string, any>;

export const valueToJSON = (node: ts.Node): JSON => {
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties
        .map<[string | undefined, any]>((node) => {
          if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
            return [node.name.text, valueToJSON(node.initializer)];
          }
          return [undefined, undefined];
        })
        .filter((a): a is [string, any] => typeof a[0] === "string"),
    );
  }
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return parseFloat(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
};
