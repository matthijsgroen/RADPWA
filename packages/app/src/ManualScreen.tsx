import { Pane } from "~src/components/Pane";
import { Panel } from "primereact/panel";
import { Splitter, SplitterPanel } from "primereact/splitter";
import React, { useEffect, useState } from "react";
import { TabPanel, TabView } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions, ColumnEvent } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import ComponentTreeView, {
  ComponentTreeNode,
} from "./components/ComponentTreeView";
import {
  PropertyItem,
  processComponentEvents,
  processComponentProps,
} from "./utils";
import { CommandType, useVsCode } from "./hooks/useVsCode";
import { ComponentLibraryMetaInformation, RuiJSONFormat } from "@rui/transform";
import { ProgressSpinner } from "primereact/progressspinner";
import { Checkbox } from "primereact/checkbox";
import { produce } from "immer";

// Keeping this here for reference
const isRef = (data: PropertyItem): data is PropertyItem<{ ref: string }> =>
  data.type.startsWith("ComponentProductRef<");

const stringValue = (data: PropertyItem): React.ReactNode => {
  if (data.value === undefined) {
    return "";
  }
  if (data.name === "id") {
    return `${data.value}`;
  }
  if (data.type === "string") {
    return <strong>{`${data.value}`}</strong>;
  }
  if (data.type === "boolean") {
    return <strong>{`${data.value}`}</strong>;
  }

  if (isRef(data)) {
    return `${data.value.ref}`;
  }
  if (data.type === "function") {
    return `${data.value}`;
  }

  return `${data.value} - ${data.type}`;
};

const mainScreen = () => {
  // Only works when the app is running in VSCode
  const { postMessage } = useVsCode();

  const [selectedComponent, setSelectedComponent] =
    useState<ComponentTreeNode | null>(null);

  const [screenStructure, setScreenStructure] = useState<RuiJSONFormat>();
  const [componentsStructure, setComponentsStructure] =
    useState<ComponentLibraryMetaInformation>();

  const selectedComponentInfo =
    selectedComponent && selectedComponent.data && componentsStructure
      ? componentsStructure[selectedComponent.data.component]
      : undefined;

  const componentPropertyList = processComponentProps(
    selectedComponent?.key,
    selectedComponent?.data?.props,
    selectedComponent?.data?.propsAsState ?? [],
    selectedComponentInfo,
  );
  const componentEventList = processComponentEvents(
    selectedComponent?.data?.events,
    selectedComponentInfo,
  );

  const onCellEditComplete = (e: ColumnEvent) => {
    console.log("new value: ", e.newValue);
    if (e.newValue === e.rowData.value) return;

    const newRuiComponents: RuiJSONFormat = JSON.parse(
      JSON.stringify(screenStructure),
    );

    const updatedRuiJson = produce(newRuiComponents, (draft) => {
      const component = draft.composition.find((c) => c.id === e.rowData.name);
      if (!component) return;

      // TODO: Either edit the prop or event based on id. Can be a
      // Record<string, any> or Record<string, any>[]

      // Add or remove the value as state if the user has checked/unchecked the
      // checkbox
      if (e.newValue.exposedAsState) {
        draft.components.push({
          id: component.id,
          component: "ComponentState",
          props: {
            initialValue: e.newValue,
          },
        });
      } else {
        const index = draft.components.findIndex((c) => c.id === component.id);
        if (index !== -1) draft.components.splice(index, 1);
      }
    });

    console.log("** Sending updated JSON to the extension **");
    postMessage({ type: CommandType.EDIT_COMMAND, data: updatedRuiJson });
  };

  useEffect(() => {
    window.addEventListener("message", receiveMessage);

    return () => {
      window.removeEventListener("message", receiveMessage);
    };
  }, []);

  const receiveMessage = (event: MessageEvent<any>) => {
    console.log("** Received message from the extension **", event.data);
    // Process the JSON data received from the extension
    if (event.data.type === "UPDATE_COMMAND") {
      setScreenStructure(event.data.data);
    }
    if (event.data.type === "UPDATE_COMPONENTS") {
      setComponentsStructure(event.data.data);
    }
  };
  const propertyEdit = (options: ColumnEditorOptions) => {
    if (options.rowData.type === "string") {
      const value = {
        value: options.rowData.value,
        exposedAsState: options.rowData.exposedAsState,
        ...options.value,
      };
      return (
        <>
          <InputText
            value={value.value}
            onChange={(e) =>
              options.editorCallback!({
                ...value,
                value: e.target.value,
              })
            }
          />
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
    }
    if (options.rowData.type === "boolean") {
      return (
        <TriStateCheckbox
          value={options.value}
          onChange={(e) => options.editorCallback!(e.target.value)}
        />
      );
    }
  };

  return (
    <Pane>
      <Splitter>
        <SplitterPanel minSize={20}>
          <Splitter layout={"vertical"}>
            <SplitterPanel minSize={10}>
              <Pane>
                <Panel header={"View"}>
                  {screenStructure ? (
                    <ComponentTreeView
                      ruiComponents={screenStructure}
                      selectedComponent={setSelectedComponent}
                    />
                  ) : (
                    <ProgressSpinner />
                  )}
                </Panel>
              </Pane>
            </SplitterPanel>
            <SplitterPanel>
              <Panel header={"Inspector"} className="w-full">
                <TabView>
                  <TabPanel header="Properties">
                    {selectedComponentInfo && (
                      <DataTable
                        value={componentPropertyList}
                        size="small"
                        stripedRows
                        scrollable
                        scrollHeight="100%"
                        editMode="cell"
                      >
                        <Column field="name" header="Name"></Column>
                        <Column
                          // field="value"
                          header="Value"
                          body={(data) => stringValue(data)}
                          editor={propertyEdit}
                          onCellEditComplete={onCellEditComplete}
                        ></Column>
                      </DataTable>
                    )}
                  </TabPanel>
                  <TabPanel header="Events">
                    {selectedComponentInfo && (
                      <DataTable
                        value={componentEventList}
                        size="small"
                        stripedRows
                        scrollable
                        scrollHeight="100%"
                      >
                        <Column field="name" header="Name"></Column>
                        <Column
                          // field="value"
                          header="Value"
                          body={(data) => stringValue(data)}
                          editor={propertyEdit}
                          onCellEditComplete={onCellEditComplete}
                        ></Column>
                      </DataTable>
                    )}
                  </TabPanel>
                </TabView>
              </Panel>
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
        <SplitterPanel>
          <Pane>
            <Panel header={"Components"}>
              {componentsStructure ? (
                <ul>
                  {Object.entries(componentsStructure).map(([k, v]) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              ) : (
                <ProgressSpinner />
              )}
            </Panel>
          </Pane>
        </SplitterPanel>
      </Splitter>
    </Pane>
  );
};
export default mainScreen;
