export const capitalize = <T extends string>(s: T) =>
  (s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;

export const decapitalize = <T extends string>(s: T) =>
  (s[0].toLowerCase() + s.slice(1)) as Lowercase<typeof s>;
