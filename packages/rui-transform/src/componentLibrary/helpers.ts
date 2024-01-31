import ts from "typescript";
import {
  ChildContainers,
  EventInfo,
  ProductionInfo,
  PropertyInfo,
} from "../compiler-types";

export const getPropertyTypes = (
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

export const getChildContainers = (
  childContainerType: ts.Type | undefined,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ChildContainers => {
  const childContainers: ChildContainers = {};

  if (childContainerType) {
    childContainerType.symbol.members?.forEach((member) => {
      if (
        member.valueDeclaration &&
        ts.isPropertySignature(member.valueDeclaration)
      ) {
        const type = member.valueDeclaration.type;
        childContainers[`${member.escapedName}`] = {
          type,
          typeAsString: type
            ? printer.printNode(ts.EmitHint.Unspecified, type, sourceFile)
            : "unknown",
        };
      }
    });
  }
  return childContainers;
};

export const getEventTypes = (
  eventType: ts.Type | undefined,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): EventInfo => {
  const events: EventInfo = {};
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
          events[`${member.escapedName}`] = {
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
  return events;
};

export const getProductionType = (
  productionTypeNode: ts.Type | undefined,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ProductionInfo | undefined => {
  if (!productionTypeNode) {
    return undefined;
  }
  const declaration = productionTypeNode.symbol.declarations?.[0];
  const typeNode =
    declaration && ts.isTypeNode(declaration) ? declaration : undefined;

  return {
    type: typeNode,
    typeAsString: typeNode
      ? printer.printNode(ts.EmitHint.Unspecified, typeNode, sourceFile)
      : "unknown",
  };
};
