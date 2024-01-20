import ts from "typescript";

export const selectAll = <R extends ts.Node>(
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

export const collectDependencies = (
  node: ts.Node,
  typeChecker: ts.TypeChecker,
): string[] => {
  const dependencies: string[] = [];

  const visit = (node: ts.Node) =>
    ts.forEachChild(
      node,
      (child) => {
        if (ts.isIdentifier(child)) {
          const symbol = typeChecker.getSymbolAtLocation(child);
          const importSpecifier = symbol?.declarations?.[0];
          if (importSpecifier && ts.isImportSpecifier(importSpecifier)) {
            const importDeclaration = importSpecifier.parent;
            const declaration = importDeclaration.parent.parent;

            const module = declaration.moduleSpecifier.getText().slice(1, -1);
            const importName = importSpecifier.name.text;
            const name = importSpecifier.propertyName?.text ?? importName;

            dependencies.push(`${module}:${name}:${importName}`);
          }
        }
        visit(child);
      },
      (nodes) => {
        nodes.forEach((node) => visit(node));
      },
    );

  visit(node);
  return dependencies;
};
