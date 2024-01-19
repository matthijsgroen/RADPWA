export type Dependency = {
  module: string;
  namedImports: { propertyName?: string; name: string }[];
  defaultImport?: string;
};

const stringToDependency = (depNotation: string): Dependency => {
  const [module, propertyName, name] = depNotation.split(":");
  if (propertyName === "default") {
    return {
      module,
      namedImports: [],
      defaultImport: name,
    };
  }
  if (name === undefined || name === propertyName) {
    return {
      module,
      namedImports: [{ name }],
    };
  }
  return {
    module,
    namedImports: [{ propertyName, name }],
  };
};

const makeNamedImports = (
  imports: { propertyName?: string; name: string }[],
): string =>
  `{ ${imports.map((item) => (item.propertyName !== undefined ? `${item.propertyName} as ${item.name}` : item.name)).join(", ")} }`;

const dependencyToString = (dep: Dependency): string => {
  const hasDefaultImport = dep.defaultImport !== undefined;
  const hasNamedImports = dep.namedImports.length > 0;

  return `import ${hasDefaultImport ? dep.defaultImport : ""}${
    hasDefaultImport && hasNamedImports ? ", " : ""
  }${hasNamedImports ? makeNamedImports(dep.namedImports) : ""} from "${dep.module}";`;
};

const mergeDependencies = (a: Dependency, b: Dependency): Dependency => ({
  module: a.module,
  defaultImport: a.defaultImport ?? b.defaultImport,
  namedImports: a.namedImports.concat(
    b.namedImports.filter(
      (b) => !a.namedImports.map((i) => i.name).includes(b.name),
    ),
  ),
});

export const buildDependencies = (dependencies: string[]) =>
  dependencies
    .map((statement) => stringToDependency(statement))
    .reduce<Dependency[]>((result, item) => {
      const existing = result.findIndex((dep) => dep.module === item.module);
      if (existing !== -1) {
        const merge = mergeDependencies(result[existing], item);
        return result.map((a, i) => (i === existing ? merge : a));
      }

      return result.concat(item);
    }, [])
    .sort((a, b) => a.module.localeCompare(b.module))
    .map((dep) => dependencyToString(dep))
    .join("\n");
