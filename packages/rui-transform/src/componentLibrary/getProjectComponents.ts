import {
  ComponentLibraryMetaInformation,
  ComponentMetaInformation,
  Resolver,
} from "../compiler-types";
import ts from "typescript";
import {
  getChildContainers,
  getEventTypes,
  getProductionType,
  getPropertyTypes,
} from "./helpers";

// const getComponentInfoFromDeclaration = (
//   node: ts.VariableDeclaration,
//   typeChecker: ts.TypeChecker,
//   printer: ts.Printer,
//   sourceFile: ts.SourceFile,
// ): ComponentMetaInformation | undefined => {
//   if (node.type && ts.isTypeReferenceNode(node.type)) {
//     const typeName = (node.type.typeName as ts.Identifier).text;

//     if (typeName === "VisualComponentDefinition") {
//       const typeArguments =
//         node.type.typeArguments ?? ts.factory.createNodeArray();
//       return {
//         componentName: node.name.getText(),
//         isVisual: true,
//         properties: getPropertyTypes(
//           typeArguments[0],
//           typeChecker,
//           printer,
//           sourceFile,
//         ),
//         events: getEventTypes(
//           typeArguments[1],
//           typeChecker,
//           printer,
//           sourceFile,
//         ),
//         produces: getProductionType(typeArguments[3], printer, sourceFile),
//         dependencies: [], // TODO
//         childContainers: getChildContainers(
//           typeArguments[2],
//           typeChecker,
//           printer,
//           sourceFile,
//         ),
//       };
//     }
//     if (typeName === "ComponentDefinition") {
//       const typeArguments =
//         node.type.typeArguments ?? ts.factory.createNodeArray();
//       return {
//         componentName: node.name.getText(),
//         isVisual: false,
//         properties: getPropertyTypes(
//           typeArguments[0],
//           typeChecker,
//           printer,
//           sourceFile,
//         ),
//         events: getEventTypes(
//           typeArguments[1],
//           typeChecker,
//           printer,
//           sourceFile,
//         ),
//         produces: getProductionType(typeArguments[2], printer, sourceFile),
//         dependencies: [], // TODO
//         childContainers: {}, // TODO
//       };
//     }
//   }
//   return undefined;
// };

// export const getProjectComponents = async (
//   libFilePath: string,
//   resolve: Resolver,
// ): Promise<ComponentLibraryMetaInformation> => {
//   const filePath = resolve(libFilePath);

//   const program = ts.createProgram([filePath], {});
//   const sourceFile = program.getSourceFile(filePath);

//   if (!sourceFile) {
//     throw new Error("Components not found");
//   }
//   const typeChecker = program.getTypeChecker();
//   const printer = ts.createPrinter();

//   // Start from the export en crawl through the file for info
//   const exportAssignment = sourceFile?.statements.find(
//     (statement): statement is ts.ExportAssignment =>
//       ts.isExportAssignment(statement),
//   );
//   if (!exportAssignment) {
//     throw new Error("Components not found");
//   }

//   const components: Record<string, ComponentMetaInformation> = {};

//   const typeInfo = typeChecker.getTypeAtLocation(exportAssignment.expression);
//   typeInfo.symbol.members?.forEach((member) => {
//     const componentName = `${member.escapedName}`;
//     console.log(componentName);
//     if (
//       member.valueDeclaration &&
//       ts.isShorthandPropertyAssignment(member.valueDeclaration)
//     ) {
//       const assignmentReference = typeChecker.getShorthandAssignmentValueSymbol(
//         member.valueDeclaration,
//       );
//       if (
//         assignmentReference?.valueDeclaration &&
//         ts.isVariableDeclaration(assignmentReference.valueDeclaration)
//       ) {
//         const componentInfo = getComponentInfoFromDeclaration(
//           assignmentReference.valueDeclaration,
//           typeChecker,
//           printer,
//           sourceFile,
//         );
//         if (componentInfo) {
//           components[componentName] = componentInfo;
//         }
//       }
//     }
//   });

//   return components;
// };
