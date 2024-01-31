/// <reference types="node" />
import { Command } from "commander";
import { convertRuiToJson } from "./ruiToJson/convert";
import { convertJsonToRui } from "./jsonToRui/convert";
import ts, { createCompilerHost } from "typescript";
import { getProjectComponentsFromType } from "./componentLibrary/getProjectComponentsFromType";

export const run = (args: string[]) => {
  const program = new Command();

  program
    .name("rui-transform")
    .description("compiles RUI TSX to plain TSX or JSON definitions")
    .version("0.8.0");

  program
    .command("to-json")
    .description("Convert a .rui.tsx to a JSON structure")
    .argument("<input-file>", "file to convert")
    .action(async (filePath: string) => {
      console.log("Parsing: ", filePath);

      const host = createCompilerHost({ rootDir: "." });
      const program = ts.createProgram({
        rootNames: [filePath, "./rapid-components.tsx"],
        options: { rootDir: "." },
        host,
      });

      const vcl = await getProjectComponentsFromType(
        program,
        "./rapid-components.tsx",
      );
      const result = await convertRuiToJson(program, filePath, vcl);
      console.log(JSON.stringify(result, undefined, 2));

      const tsxResult = await convertJsonToRui(result, vcl);
      console.log(tsxResult);
    });

  program.parseAsync(args);
};
