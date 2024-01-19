import { LogicBlocks, LogicMap } from "./logic";
import { ValueType, valueToCode } from "./valueToCode";

export const buildProps = (
  props: Record<string, ValueType<unknown>>,
  logicBlocks: LogicBlocks,
): LogicMap => {
  const deps: string[] = [];
  const map = Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      const { code, dependencies } = valueToCode(value, logicBlocks);
      deps.push(...dependencies);

      return [key, code];
    }),
  );

  return { map, dependencies: deps };
};
