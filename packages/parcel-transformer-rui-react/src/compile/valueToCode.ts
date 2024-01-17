type ValueType<T> = { type: string; value: T };

export const valueToCode = <T>(
  value: ValueType<T>,
  logicBlocks: Record<string, string>,
) => {
  switch (value.type) {
    case "string": {
      return `"${value.value}"`;
    }
    case "number": {
      return value.value;
    }
    case "type": {
      return value.value;
    }
    case "functionReference": {
      return logicBlocks[value.value as string];
    }
  }
  return '"unknown"';
};
