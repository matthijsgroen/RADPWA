export const buildDependencies = (dependencies) =>
  dependencies
    .map((statement) => {
      const [entry, importName, componentName] = statement.split(":");
      if (importName === componentName) {
        return `import { ${componentName} } from "${entry}";`;
      }
      if (importName === "default") {
        return `import ${componentName} from "${entry}";`;
      }
      return `import { ${importName} as ${componentName} } from "${entry}";`;
    })
    .join("\n");
