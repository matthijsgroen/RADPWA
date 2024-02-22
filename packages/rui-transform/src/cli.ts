/// <reference types="node" />
import { Command } from "commander";
import { convertRuiToJson } from "./ruiToJson/convert";
import { convertJsonToRui } from "./jsonToRui/convert";
import ts, { createCompilerHost, isTypeNode } from "typescript";
import { getProjectComponentsFromType } from "./componentLibrary/getProjectComponentsFromType";
import { readFile } from "fs/promises";

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
      const contents = await readFile(filePath, "utf-8");

      const vcl = await getProjectComponentsFromType(
        program,
        "./rapid-components.tsx",
      );
      console.log(
        JSON.stringify(
          vcl,
          (_key, value) => {
            if (value && typeof value === "object" && isTypeNode(value)) {
              return undefined;
            }
            return value;
          },
          2,
        ),
      );
      // const jsonResult = await convertRuiToJson(filePath, contents, vcl);
      // console.log(JSON.stringify(jsonResult, undefined, 2));

      // const tsxResult = await convertJsonToRui(jsonResult, vcl);
      // console.log(tsxResult);
    });

  program
    .command("from-json")
    .description("Convert a .json to a .rui.tsx structure")
    .argument("<input-file>", "file to convert")
    .action(async (filePath: string) => {
      console.log("Parsing: ", filePath);

      const host = createCompilerHost({ rootDir: "." });
      const program = ts.createProgram({
        rootNames: ["./rapid-components.tsx"],
        options: { rootDir: "." },
        host,
      });

      const vcl = await getProjectComponentsFromType(
        program,
        "./rapid-components.tsx",
      );
      const jsonContent = await readFile(filePath, "utf-8");
      const jsonResult = JSON.parse(jsonContent);

      const tsxResult = await convertJsonToRui(jsonResult, vcl);
      console.log(tsxResult);
    });

  program.parseAsync(args);
};
