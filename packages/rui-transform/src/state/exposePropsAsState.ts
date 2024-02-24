import { useState } from "react";

export const exposePropsAsState = <
  TProps,
  TPropKey extends keyof TProps,
  TOriginal,
>(
  original: TOriginal,
  props: TProps,
  ...keys: TPropKey[]
): Pick<TProps, TPropKey> & TOriginal => {
  const [values, updateValues] = useState(keys.map((k) => props[k]));
  for (const keyIndex in keys) {
    const key = keys[keyIndex];
    Object.defineProperty(original, key, {
      get() {
        return values[keyIndex];
      },
      set(value) {
        updateValues((previous) => {
          const updated = [...previous];
          updated[keyIndex] = value;
          return updated;
        });
      },
      enumerable: true,
    });
  }

  return original as Pick<TProps, TPropKey> & TOriginal;
};
