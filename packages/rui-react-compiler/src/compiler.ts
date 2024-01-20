import * as prettier from "prettier";
import * as ts from "typescript";
import { buildDataComponent } from "./compile/dataComponent";
import { buildVisualComponent } from "./compile/visualComponent";
import { buildDependencies } from "./compile/dependencies";
import { LogicBlocks, buildHandlers } from "./compile/logic";
import { generateLogicFile } from "./compile/eventFileGenerator";
export type { Config } from "./Config";

export const compiler = async (interfaceFile, configuration, logicCodePath) => {
  const mainId = interfaceFile["id"];

  let logicBlocks: LogicBlocks = {};
  const program = ts.createProgram([logicCodePath], { allowJs: true });
  const sourceFile = program.getSourceFile(logicCodePath);

  if (sourceFile) {
    logicBlocks = buildHandlers(sourceFile, program);
  }

  const children = interfaceFile.children.map((visualComponent) =>
    buildVisualComponent(visualComponent, configuration, logicBlocks),
  );

  const components = interfaceFile.components.map((component) =>
    buildDataComponent(component, configuration, logicBlocks),
  );

  console.log("generating logic file...");
  const logicFile = await generateLogicFile(interfaceFile, configuration);
  console.log(logicFile);

  const dependencies = children
    .flatMap((child) => child.dependencies)
    .concat(components.flatMap((comp) => comp.dependencies));

  const code = await prettier.format(
    `${buildDependencies(dependencies)}
    const ${mainId} = () => {
    ${components.map((e) => e.code).join("\n")}
    return (
    ${children.length > 1 ? "<>" : ""}
    ${children.map((e) => e.code).join("\n")}
    ${children.length > 1 ? "</>" : ""}
    )}; export default ${mainId};
    `,
    { parser: "typescript" },
  );
  // console.log(code);

  return code;
};
