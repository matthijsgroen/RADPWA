/// <reference types="node" />
import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { Resolver } from "./compiler-types";
import { convertRuiToJson } from "./ruiToJson/convert";
import { convertJsonToRui } from "./jsonToRui/convert";
import ts, { resolveModuleName } from "typescript";
import Parcel, { createWorkerFarm } from "@parcel/core";
import { MemoryFS } from "@parcel/fs";

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
      const sourceFile = await readFile(filePath, { encoding: "utf-8" });

      const sourceFileFolder = dirname(resolve(filePath));
      const compilerHost = ts.createCompilerHost({ rootDir: sourceFileFolder });

      const resolver: Resolver = (module: string): string => {
        const fileResolve = resolveModuleName(
          module,
          filePath,
          { allowJs: true },
          compilerHost,
        );
        if (!fileResolve.resolvedModule) {
          throw new Error("Module not found");
        }
        return fileResolve.resolvedModule.resolvedFileName;
      };

      const result = await convertRuiToJson(sourceFile, resolver);
      console.log(JSON.stringify(result, undefined, 2));

      const tsxResult = await convertJsonToRui(result, resolver);
      console.log(tsxResult);
    });

  program.parseAsync(args);
};
