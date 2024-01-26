import ts, { factory as f } from "typescript";

export const convertValue = (v: unknown) => {
  if (typeof v === "string") {
    return f.createStringLiteral(v);
  }

  return f.createStringLiteral("Not yet supported");
};

type JSON = null | string | number | JSON[] | Record<string, any>;

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
  return null;
};
