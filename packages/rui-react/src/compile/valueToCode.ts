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
    case "dataReference": {
      return value.value;
    }
    case "Object": {
      // Should handle sub processing of elements
      if (Array.isArray(value.value)) {
        return `[${value.value.map((v) => valueToCode(v, logicBlocks)).join(", ")}]`;
      }
      return `{${Object.entries(
        value.value as Record<string, ValueType<string>>,
      )
        .map(([k, v]) => `${k}: ${valueToCode(v, logicBlocks)}`)
        .join(", ")}}`;
    }
  }
  return '"unknown"';
};
