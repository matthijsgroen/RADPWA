import { RuiDependency, RuiTypeDeclaration } from "@rui/transform";
import { AutoComplete } from "primereact/autocomplete";
import React, { useState } from "react";

type Props = {
  value: RuiTypeDeclaration;
  onChange: (value: RuiTypeDeclaration) => void;
};

const builtInTypes: RuiTypeDeclaration[] = [
  { type: "number", dependencies: [], optional: false },
  { type: "boolean", dependencies: [], optional: false },
  { type: "string", dependencies: [], optional: false },
  { type: "unknown", dependencies: [], optional: false },
];

export const ProjectTypeInput: React.FC<Props> = ({ value, onChange }) => {
  // TODO: Communicate with the 'backend' for autocomplete suggestions based on

  const [suggestions, setSuggestions] =
    useState<RuiTypeDeclaration[]>(builtInTypes);

  return (
    <AutoComplete
      field="type"
      value={value}
      suggestions={suggestions}
      completeMethod={(event) => {
        const builtin = builtInTypes.filter((t) =>
          t.type.startsWith(event.query),
        );

        setSuggestions(builtin);
      }}
      forceSelection
      onChange={(e) => {
        // console.log(e.value);
        onChange(e.value);
      }}
    />
  );
};
