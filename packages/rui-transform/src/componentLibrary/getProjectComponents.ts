import {
  ComponentMetaInformation,
  EventInfo,
  PropertyInfo,
  Resolver,
} from "../compiler-types";
import ts from "typescript";

const getPropertyTypes = (
  propertyType: ts.Type | undefined,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): PropertyInfo => {
  const properties: PropertyInfo = {};
  if (propertyType) {
    propertyType.symbol.members?.forEach((member) => {
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
  eventType: ts.Type | undefined,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): EventInfo => {
  const properties: EventInfo = {};
  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  if (eventType) {
    eventType.symbol.members?.forEach((member) => {
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

export const getProjectComponents = async (
  libFilePath: string,
  resolve: Resolver,
) => {
  const filePath = resolve(libFilePath);

  const program = ts.createProgram([filePath], {});
  const componentLibrarySource = program.getSourceFile(filePath);

  if (!componentLibrarySource) {
    throw new Error("Components not found");
  }
  const typeChecker = program.getTypeChecker();
  const printer = ts.createPrinter();

  // Start from the export en crawl through the file for info
  const exportAssignment = componentLibrarySource?.statements.find(
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
    const componentCode = member.valueDeclaration;
    if (!componentCode) {
      return;
    }
    const componentType = typeChecker.getTypeAtLocation(componentCode);
    const componentTypeName = componentType.aliasSymbol?.escapedName;
    if (componentTypeName === "VisualComponentDefinition") {
      const infoBlocks = componentType.aliasTypeArguments;
      const propertyInfo = infoBlocks?.[0];
      const properties = getPropertyTypes(
        propertyInfo,
        printer,
        componentLibrarySource,
      );
      const eventInfo = infoBlocks?.[1];
      const events = getEventTypes(eventInfo, printer, componentLibrarySource);

      components[componentName] = {
        componentName,
        isVisual: true,
        properties,
        events,
        dependencies: [],
      };
    }
    if (componentTypeName === "ComponentDefinition") {
      const infoBlocks = componentType.aliasTypeArguments;
      const propertyInfo = infoBlocks?.[0];
      const properties = getPropertyTypes(
        propertyInfo,
        printer,
        componentLibrarySource,
      );
      const eventInfo = infoBlocks?.[1];
      const events = getEventTypes(eventInfo, printer, componentLibrarySource);

      components[componentName] = {
        componentName,
        isVisual: false,
        properties,
        events,
        dependencies: [],
      };
    }
  });

  return components;
};
