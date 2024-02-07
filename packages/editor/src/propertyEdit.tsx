import { Checkbox } from "primereact/checkbox";
import { ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import React, { PropsWithChildren } from "react";

const EditorWithState: React.FC<
  PropsWithChildren<{
    value: { value: unknown; exposedAsState: boolean };
    options: ColumnEditorOptions;
  }>
> = ({ children, value, options }) => (
  <>
    {children}
    <br />
    <label>
      expose as state:
      <Checkbox
        checked={value.exposedAsState}
        onChange={(e) =>
          options.editorCallback!({
            ...value,
            exposedAsState: !!e.target.checked,
          })
        }
      />
    </label>
  </>
);

export const propertyEdit = (options: ColumnEditorOptions) => {
  if (options.rowData.type === "string") {
    const value = {
      value: options.rowData.value,
      exposedAsState: options.rowData.exposedAsState,
      ...options.value,
    };
    return (
      <EditorWithState value={value} options={options}>
        <InputText
          value={value.value}
          onChange={(e) =>
            options.editorCallback!({
              ...value,
              value: e.target.value,
            })
          }
        />
      </EditorWithState>
    );
  }
  if (options.rowData.type === "boolean") {
    const value = {
      value: options.rowData.value,
      exposedAsState: options.rowData.exposedAsState,
      ...options.value,
    };
    return (
      <EditorWithState value={value} options={options}>
        <TriStateCheckbox
          value={options.value}
          onChange={(e) =>
            options.editorCallback!({
              ...value,
              value: e.target.value,
            })
          }
        />
      </EditorWithState>
    );
  }
};
