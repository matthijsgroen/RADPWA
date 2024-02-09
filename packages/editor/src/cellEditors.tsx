import { Checkbox } from "primereact/checkbox";
import { ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { KeyFilterType } from "primereact/keyfilter";
import React from "react";
import { ProjectTypeInput } from "./components/ProjectTypeInput";

export const cellTextEditor = (
  options: ColumnEditorOptions,
  filter?: KeyFilterType,
) => (
  <InputText
    value={options.value}
    size={"small"}
    keyfilter={filter}
    onChange={(e) => options.editorCallback!(e.target.value)}
  />
);

export const cellBooleanEditor = (options: ColumnEditorOptions) => (
  <Checkbox
    checked={options.value}
    onChange={(e) => options.editorCallback!(e.target.checked)}
  />
);

export const cellIntelliSenseType = (options: ColumnEditorOptions) => (
  <ProjectTypeInput
    value={options.value}
    onChange={(value) => {
      options.editorCallback!(value);
    }}
  />
);
