import { useEffect, useState } from "react";
import { useVsCode } from "./useVsCode";

export type VSCodeState<T extends Record<string, unknown>> = T & {
  [Key in keyof T as `set${Capitalize<Key & string>}`]: (value: T[Key]) => void;
};

export const useVsCodeState = <T extends Record<string, unknown>>(
  initialState: T,
  dataMapper: Record<string, keyof T>,
): VSCodeState<T> => {
  const result: Record<string, unknown> = {};
  const { setState, getState } = useVsCode();

  useEffect(() => {
    window.addEventListener("message", receiveMessage);

    return () => {
      window.removeEventListener("message", receiveMessage);
    };
  }, []);

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

  const receiveMessage = (event: MessageEvent<{ type: string; data: any }>) => {
    const type = event.data.type;
    const value = event.data.data;
    const key = dataMapper[type];
    if (key) {
      const state = getState() ?? initialState;
      setState({ ...state, [key]: value });
      updateState((v) => (v + 1) % 4);
    }
  };

  return result as VSCodeState<T>;
};
