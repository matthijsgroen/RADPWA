import ts from "typescript";

export type Dependency = {
  module: string;
  namedImports: { propertyName?: string; name: string }[];
  defaultImport?: string;
};

export const stringToDependency = (depNotation: string): Dependency => {
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
      namedImports: [{ name: propertyName }],
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

export const dependencyToCode = (dep: Dependency): string => {
  const hasDefaultImport = dep.defaultImport !== undefined;
  const hasNamedImports = dep.namedImports.length > 0;

  return `import ${hasDefaultImport ? dep.defaultImport : ""}${
    hasDefaultImport && hasNamedImports ? ", " : ""
  }${hasNamedImports ? makeNamedImports(dep.namedImports) : ""} from "${dep.module}";`;
};

const mergeDependency = (a: Dependency, b: Dependency): Dependency => ({
  module: a.module,
  defaultImport: a.defaultImport ?? b.defaultImport,
  namedImports: a.namedImports.concat(
    b.namedImports.filter(
      (b) => !a.namedImports.map((i) => i.name).includes(b.name),
    ),
  ),
});

export const mergeDependencies = (dependencies: Dependency[]): Dependency[] =>
  dependencies
    .reduce<Dependency[]>((result, item) => {
      const existing = result.findIndex((dep) => dep.module === item.module);
      if (existing !== -1) {
        const merge = mergeDependency(result[existing], item);
        return result.map((a, i) => (i === existing ? merge : a));
      }

      return result.concat(item);
    }, [])
    .sort((a, b) => a.module.localeCompare(b.module));

export const buildDependencies = (dependencies: string[]) =>
  mergeDependencies(
    dependencies.map((statement) => stringToDependency(statement)),
  )
    .map((dep) => dependencyToCode(dep))
    .join("\n");

const f = ts.factory;

export const namedImportToTS = (
  namedImports: Dependency["namedImports"],
): ts.ImportSpecifier[] =>
  namedImports.map((named) =>
    f.createImportSpecifier(
      false,
      named.propertyName ? f.createIdentifier(named.propertyName) : undefined,
      f.createIdentifier(named.name),
    ),
  );

export const dependenciesToTS = (
  dependencies: Dependency[],
): ts.ImportDeclaration[] =>
  dependencies.map((d) =>
    f.createImportDeclaration(
      undefined,
      f.createImportClause(
        false,
        undefined,
        f.createNamedImports(namedImportToTS(d.namedImports)),
      ),
      f.createStringLiteral(d.module),
    ),
  );
