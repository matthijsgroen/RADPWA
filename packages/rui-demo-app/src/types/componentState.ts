import { useState } from "react";

export const useComponentState = <T>(defaultValue: T): { value: T } => {
  const [value, setValue] = useState<T>(defaultValue);
  return {
    get value() {
      return value;
    },
    set value(newValue) {
      setValue(newValue);
    },
  };
};
