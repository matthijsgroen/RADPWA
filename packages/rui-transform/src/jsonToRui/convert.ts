import ts, { ImportSpecifier, NodeFlags, SyntaxKind } from "typescript";
import { Resolver, RuiJSONFormat } from "../compiler-types";
import { getProjectComponents } from "../componentLibrary/getProjectComponents";

const f = ts.factory;

const reactImport = () =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier("React"), undefined),
    f.createStringLiteral("react"),
  );

const helpersImport = () =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(
      true,
      undefined,
      f.createNamedImports(
        ["PropertiesOf", "EventsOf"].map<ImportSpecifier>((name) =>
          f.createImportSpecifier(false, undefined, f.createIdentifier(name)),
        ),
      ),
    ),
    f.createStringLiteral("@rui/transform"),
  );

const componentsImport = (componentsModule: string) =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier("Components"), undefined),
    f.createStringLiteral(componentsModule),
  );

const eventHandlersImport = (handlersModule: string) =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier("eventHandlers"), undefined),
    f.createStringLiteral(handlersModule),
  );

const defineComponentTypes = () =>
  f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier("CL"),
    undefined,
    f.createTypeQueryNode(f.createIdentifier("Components"), undefined),
  );

// We need some VCL insight to continue here...
export const defineScopeType = () =>
  f.createTypeAliasDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createIdentifier("Scope"),
    undefined,
    f.createTypeLiteralNode([]),
  );

const createComponentFunction = (name: string, statements: ts.Statement[]) =>
  f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList([
      f.createVariableDeclaration(
        f.createIdentifier(name),
        undefined,
        undefined,
        f.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          f.createBlock(statements),
        ),
      ),
    ]),
  );

export const convertJsonToRui = async (
  structure: RuiJSONFormat,
  resolve: Resolver,
): Promise<string> => {
  const printer = ts.createPrinter();

  const componentLibraryInfo = await getProjectComponents(
    structure.componentLibrary,
    resolve,
  );

  console.log(
    JSON.stringify(
      componentLibraryInfo,
      (key, value) => {
        if (key === "type" && ts.isTypeNode(value)) {
          return "(ts.TypeNode)";
        }
        return value;
      },
      2,
    ),
  );

  const sourceFile = f.createSourceFile(
    [
      reactImport(),
      helpersImport(),
      componentsImport(structure.componentLibrary),
      eventHandlersImport(structure.eventHandlers),
      defineComponentTypes(),
      defineScopeType(),
      createComponentFunction(structure.id, []),
    ],
    f.createToken(SyntaxKind.EndOfFileToken),
    NodeFlags.None,
  );

  const contents = printer.printFile(sourceFile);

  return contents;
};
