import {
  ComponentLibraryMetaInformation,
  ComponentMetaInformation,
  EventInfo,
  ProductionInfo,
  PropertyInfo,
  Resolver,
} from "../compiler-types";
import ts from "typescript";

const getPropertyTypes = (
  propertyType: ts.TypeNode | undefined,
  typeChecker: ts.TypeChecker,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): PropertyInfo => {
  const properties: PropertyInfo = {};

  const typeInfo = propertyType
    ? typeChecker.getTypeAtLocation(propertyType)
    : undefined;
  if (typeInfo) {
    typeInfo.symbol.members?.forEach((member) => {
      if (
        member.valueDeclaration &&
        ts.isPropertySignature(member.valueDeclaration)
      ) {
        const type = member.valueDeclaration.type;
        properties[`${member.escapedName}`] = {
          type,
          typeAsString: type
            ? printer.printNode(ts.EmitHint.Unspecified, type, sourceFile)
            : "unknown",
        };
      }
    });
  }
  return properties;
};

const getEventTypes = (
  eventType: ts.TypeNode | undefined,
  typeChecker: ts.TypeChecker,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): EventInfo => {
  const properties: EventInfo = {};
  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  const eventInfo = eventType
    ? typeChecker.getTypeAtLocation(eventType)
    : undefined;

  if (eventInfo) {
    eventInfo.symbol.members?.forEach((member) => {
      if (
        member.valueDeclaration &&
        ts.isPropertySignature(member.valueDeclaration)
      ) {
        const type = member.valueDeclaration.type;
        if (type && ts.isFunctionTypeNode(type)) {
          const returnTypeAsString = print(type.type);
          properties[`${member.escapedName}`] = {
            type,
            returnTypeAsString,
            parameters: type.parameters.map<[name: string, type: string]>(
              (p) =>
                p.type
                  ? [print(p.name), print(p.type)]
                  : [print(p.name), "unknown"],
            ),
          };
        }
      }
    });
  }
  return properties;
};

const getProductionType = (
  productionTypeNode: ts.TypeNode | undefined,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ProductionInfo | undefined => {
  if (!productionTypeNode) {
    return undefined;
  }
  return {
    type: productionTypeNode,
    typeAsString: productionTypeNode
      ? printer.printNode(
          ts.EmitHint.Unspecified,
          productionTypeNode,
          sourceFile,
        )
      : "unknown",
  };
};

const getComponentInfoFromDeclaration = (
  node: ts.VariableDeclaration,
  typeChecker: ts.TypeChecker,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ComponentMetaInformation | undefined => {
  if (node.type && ts.isTypeReferenceNode(node.type)) {
    const typeName = (node.type.typeName as ts.Identifier).text;
    console.log(typeName);

    if (typeName === "VisualComponentDefinition") {
      const typeArguments =
        node.type.typeArguments ?? ts.factory.createNodeArray();
      return {
        componentName: node.name.getText(),
        isVisual: true,
        properties: getPropertyTypes(
          typeArguments[0],
          typeChecker,
          printer,
          sourceFile,
        ),
        events: getEventTypes(
          typeArguments[1],
          typeChecker,
          printer,
          sourceFile,
        ),
        produces: getProductionType(typeArguments[3], printer, sourceFile),
        dependencies: [],
      };
    }
    if (typeName === "ComponentDefinition") {
      const typeArguments =
        node.type.typeArguments ?? ts.factory.createNodeArray();
      return {
        componentName: node.name.getText(),
        isVisual: false,
        properties: getPropertyTypes(
          typeArguments[0],
          typeChecker,
          printer,
          sourceFile,
        ),
        events: getEventTypes(
          typeArguments[1],
          typeChecker,
          printer,
          sourceFile,
        ),
        produces: getProductionType(typeArguments[2], printer, sourceFile),
        dependencies: [],
      };
    }
  }
  return undefined;
};

export const getProjectComponents = async (
  libFilePath: string,
  resolve: Resolver,
): Promise<ComponentLibraryMetaInformation> => {
  const filePath = resolve(libFilePath);

  const program = ts.createProgram([filePath], {});
  const sourceFile = program.getSourceFile(filePath);

  if (!sourceFile) {
    throw new Error("Components not found");
  }
  const typeChecker = program.getTypeChecker();
  const printer = ts.createPrinter();

  // Start from the export en crawl through the file for info
  const exportAssignment = sourceFile?.statements.find(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement),
  );
  if (!exportAssignment) {
    throw new Error("Components not found");
  }

  const components: Record<string, ComponentMetaInformation> = {};

  const typeInfo = typeChecker.getTypeAtLocation(exportAssignment.expression);
  typeInfo.symbol.members?.forEach((member) => {
    const componentName = `${member.escapedName}`;
    if (
      member.valueDeclaration &&
      ts.isShorthandPropertyAssignment(member.valueDeclaration)
    ) {
      const assignmentReference = typeChecker.getShorthandAssignmentValueSymbol(
        member.valueDeclaration,
      );
      if (
        assignmentReference?.valueDeclaration &&
        ts.isVariableDeclaration(assignmentReference.valueDeclaration)
      ) {
        const componentInfo = getComponentInfoFromDeclaration(
          assignmentReference.valueDeclaration,
          typeChecker,
          printer,
          sourceFile,
        );
        console.log(componentInfo);
        if (componentInfo) {
          components[componentName] = componentInfo;
        }
      }
    }
  });

  return components;
};
