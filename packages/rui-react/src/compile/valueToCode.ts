import { Logic, LogicBlocks } from "./types";

export type ValueType<T> = { type: string; value: T };

export const valueToCode = <T>(
  value: ValueType<T>,
  logicBlocks: LogicBlocks,
): Logic => {
  switch (value.type) {
    case "string": {
      return { code: `"${value.value}"`, dependencies: [] };
    }
    case "number": {
      return { code: `${value.value}`, dependencies: [] };
    }
    case "type": {
      return { code: `${value.value}`, dependencies: [] };
    }
    case "functionReference": {
      return logicBlocks[value.value as string];
    }
    case "dataReference": {
      return { code: `${value.value}`, dependencies: [] };
    }
    case "Object": {
      // Should handle sub processing of elements
      if (Array.isArray(value.value)) {
        const logic = value.value.reduce<Logic>(
          (result, item, index) => {
            const itemLogic = valueToCode(item, logicBlocks);
            return {
              code: `${result.code}${index > 0 ? "," : ""}${itemLogic.code}`,
              dependencies: result.dependencies.concat(itemLogic.dependencies),
            };
          },
          {
            code: "",
            dependencies: [],
          },
        );
        return {
          code: `[${logic.code}]`,
          dependencies: logic.dependencies,
        };
      }
      const deps: string[] = [];

      const code = `{${Object.entries(
        value.value as Record<string, ValueType<string>>,
      )
        .map(([k, v]) => {
          const { code, dependencies } = valueToCode(v, logicBlocks);
          deps.push(...dependencies);
          return `${k}: ${code}`;
        })
        .join(", ")}}`;
      return {
        code,
        dependencies: deps,
      };
    }
  }
  return { code: '"unknown"', dependencies: [] };
};
