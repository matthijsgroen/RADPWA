import { Checkbox } from "primereact/checkbox";
import { ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import React from "react";

export const cellTextEditor = (options: ColumnEditorOptions) => (
  <InputText
    value={options.value}
    onChange={(e) => options.editorCallback!(e.target.value)}
  />
);

export const cellBooleanEditor = (options: ColumnEditorOptions) => (
  <Checkbox
    checked={options.value}
    onChange={(e) => options.editorCallback!(e.target.checked)}
  />
);
