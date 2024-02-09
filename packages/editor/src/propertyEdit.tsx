import { Checkbox } from "primereact/checkbox";
import { ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import React, { PropsWithChildren } from "react";
import { isFunction } from "./utils";

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
  if (options.rowData.name === "id") {
    const value = {
      value: options.rowData.value,
      exposedAsState: false,
      ...options.value,
    };
    return (
      <InputText
        value={value.value}
        size={"small"}
        keyfilter={"alphanum"}
        onChange={(e) =>
          options.editorCallback!({
            ...value,
            value: e.target.value,
          })
        }
      />
    );
  }
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
          size={"small"}
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
      value:
        options.value === undefined
          ? options.rowData.value
          : options.value.value,
      exposedAsState: options.rowData.exposedAsState,
    };
    return (
      <EditorWithState value={value} options={options}>
        <TriStateCheckbox
          value={value.value}
          onChange={(e) => {
            options.editorCallback!({
              ...value,
              value: e.value,
            });
          }}
        />
      </EditorWithState>
    );
  }
  if (isFunction(options.rowData)) {
    const value = options.value ?? options.rowData.value;
    return (
      <InputText
        size={"small"}
        keyfilter={"alphanum"}
        value={value}
        onChange={(e) => options.editorCallback!(e.target.value)}
      />
    );
  }

  return options.rowData.type;
};
