import { useState } from "react";

export type VSCodeState<T extends Record<string, unknown>> = T & {
  [Key in keyof T as `set${Capitalize<Key & string>}`]: (value: T[Key]) => void;
};

export const useVsCodeState = <T extends Record<string, unknown>>(
  getState: () => any,
  setState: (state: any) => void,
  initialState: T,
): VSCodeState<T> => {
  const result: Record<string, unknown> = {};

  const [_, updateState] = useState(0);

  const currentState = getState() ?? initialState;
  for (const key in initialState) {
    const value = currentState[key];
    result[key] = value;
    result[`set${key[0].toUpperCase()}${key.slice(1)}`] = (
      newValue: unknown,
    ) => {
      setState({ ...currentState, [key]: newValue });
      // To Rerender and update value
      updateState((v) => (v + 1) % 4);
    };
  }

  return result as VSCodeState<T>;
};
