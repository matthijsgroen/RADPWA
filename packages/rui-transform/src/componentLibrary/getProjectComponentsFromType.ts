import ts from "typescript";
import { ComponentLibraryMetaInformation } from "../compiler-types";
import {
  getChildContainers,
  getEventTypes,
  getProductionType,
  getPropertyTypes,
} from "./helpers";

export const getProjectComponentsFromType = (
  program: ts.Program,
  filePath: string,
): ComponentLibraryMetaInformation => {
  const typeChecker = program.getTypeChecker();
  const printer = ts.createPrinter();

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    return {};
  }

  let typeInfo = undefined as ts.Type | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node)) {
      typeInfo = typeChecker.getTypeAtLocation(node.expression);
    }
  });
  if (!typeInfo) {
    return {};
  }

  const result: ComponentLibraryMetaInformation = {};
  const addComponentInfo = (
    name: string,
    baseType: string,
    typeArguments: readonly ts.Type[],
  ) => {
    const isVisual = baseType === "VisualComponentDefinition";

    result[name] = {
      componentName: name,
      isVisual,
      properties: getPropertyTypes(typeArguments[0], printer, sourceFile),
      events: getEventTypes(typeArguments[1], printer, sourceFile),
      produces: getProductionType(
        typeArguments[isVisual ? 3 : 2],
        printer,
        sourceFile,
      ),
      dependencies: [], // TODO
      childContainers: getChildContainers(
        typeArguments[isVisual ? 2 : 3],
        printer,
        sourceFile,
      ),
    };
  };

  typeInfo.getProperties().forEach((property) => {
    if (
      property.valueDeclaration &&
      ts.isPropertySignature(property.valueDeclaration) &&
      property.valueDeclaration.type &&
      ts.isTypeReferenceNode(property.valueDeclaration.type)
    ) {
      // This is for imported types
      const aliasTypeInfo = property.valueDeclaration.type;

      const typeInfo = typeChecker.getTypeFromTypeNode(aliasTypeInfo);
      if (typeInfo.aliasSymbol) {
        const baseType = typeInfo.aliasSymbol.name;
        const typeArguments = typeInfo.aliasTypeArguments;
        addComponentInfo(property.name, baseType, typeArguments ?? []);
      }
    } else {
      const typeInfo = typeChecker.getTypeOfSymbol(property);
      if (typeInfo.aliasSymbol) {
        const baseType = typeInfo.aliasSymbol.name;
        const typeArguments = typeInfo.aliasTypeArguments;
        addComponentInfo(property.name, baseType, typeArguments ?? []);
      }
    }
  });

  return result;
};
