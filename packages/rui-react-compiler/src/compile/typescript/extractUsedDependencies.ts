import ts from "typescript";
import { stringToDependency } from "../dependencies";

export const extractUsedDependencies = (
  code: ts.Node,
  dependencies: string[],
) => {
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
