import * as prettier from "prettier";
import * as ts from "typescript";
import { buildDataComponent } from "./compile/dataComponent";
import { buildVisualComponent } from "./compile/visualComponent";
import { buildDependencies } from "./compile/dependencies";
import { buildHandlers } from "./compile/logic";

export const compiler = async (interfaceFile, configuration, logicCodePath) => {
  const mainId = interfaceFile["id"];

  let logicBlocks: Record<string, string> = {};
  const program = ts.createProgram([logicCodePath], { allowJs: true });
  const sourceFile = program.getSourceFile(logicCodePath);
  if (sourceFile) {
    logicBlocks = buildHandlers(sourceFile);
  }

  const children = interfaceFile.children.map((visualComponent) =>
    buildVisualComponent(visualComponent, configuration, logicBlocks),
  );

  const components = interfaceFile.components.map((component) =>
    buildDataComponent(component, configuration, logicBlocks),
  );

  const dependencies = children
    .flatMap((child) => child.dependencies)
    .concat(components.flatMap((comp) => comp.dependencies));

  const code = await prettier.format(
    `
        ${buildDependencies(dependencies)}

        const ${mainId} = () => {
            ${components.map((e) => e.code).join("\n")}

            return (
              ${children.length > 1 ? "<>" : ""}
              ${children.map((e) => e.code).join("\n")}
              ${children.length > 1 ? "</>" : ""}
            )
        };

        export default ${mainId};
    `,
    { parser: "typescript" },
  );
  console.log(code);

  return code;
};
