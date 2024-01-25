import { factory as f } from "typescript";

export const convertValue = (v: unknown) => {
  if (typeof v === "string") {
    return f.createStringLiteral(v);
  }

  return f.createStringLiteral("Not yet supported");
};
