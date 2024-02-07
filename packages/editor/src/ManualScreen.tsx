import { Pane } from "~src/components/Pane";
import { Panel } from "primereact/panel";
import { Splitter, SplitterPanel } from "primereact/splitter";
import React, { useEffect, useState } from "react";
import { TabPanel, TabView } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions, ColumnEvent } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import ComponentTreeView from "./components/ComponentTreeView";
import {
  PropertyItem,
  processComponentEvents,
  processComponentProps,
} from "./utils";
import { CommandType, useVsCode } from "./hooks/useVsCode";
import {
  ComponentLibraryMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { ProgressSpinner } from "primereact/progressspinner";
import { Checkbox } from "primereact/checkbox";
import { updateProperty } from "./mutations/updateProperty";
import { treeSearch } from "./mutations/treeSearch";

// Keeping this here for reference
const isRef = (data: PropertyItem): data is PropertyItem<{ ref: string }> =>
  data.type.startsWith("ComponentProductRef<");

const stringValue = (data: PropertyItem): React.ReactNode => {
  const stateMarker = data.exposedAsState ? "🗒️ " : "";
  if (data.name === "id") {
    return `${data.value}`;
  }
  if (data.value === undefined) {
    return `${stateMarker}`;
  }
  if (data.type === "string") {
    return (
      <strong>
        {stateMarker}
        {`${data.value}`}
      </strong>
    );
  }
  if (data.type === "boolean") {
    return (
      <strong>
        {stateMarker}
        {`${data.value}`}
      </strong>
    );
  }

  if (isRef(data)) {
    return `${stateMarker}${data.value.ref}`;
  }
  if (data.type === "function") {
    return `${stateMarker}${data.value}`;
  }

  return `${stateMarker}${data.value} - ${data.type}`;
};

const mainScreen = () => {
  // Only works when the app is running in VSCode
  const { postMessage } = useVsCode();

  const [selectedComponentId, setSelectedComponent] = useState<string | null>(
    null,
  );

  const [screenStructure, setScreenStructure] = useState<RuiJSONFormat>();
  const [componentsStructure, setComponentsStructure] =
    useState<ComponentLibraryMetaInformation>();

  const selectedComponent: RuiVisualComponent | RuiDataComponent | undefined =
    selectedComponentId
      ? treeSearch(selectedComponentId, screenStructure?.components ?? []) ||
        treeSearch(selectedComponentId, screenStructure?.composition ?? [])
      : undefined;

  const selectedComponentInfo =
    selectedComponent && componentsStructure
      ? componentsStructure[selectedComponent.component]
      : undefined;

  const componentPropertyList = selectedComponent
    ? processComponentProps(
        selectedComponent.id,
        selectedComponent.props,
        selectedComponent.propsAsState ?? [],
        selectedComponentInfo,
      )
    : [];
  const componentEventList = selectedComponent
    ? processComponentEvents(selectedComponent.events, selectedComponentInfo)
    : [];

  const onCellEditComplete = (e: ColumnEvent) => {
    console.log("new value: ", e.newValue);
    if (selectedComponent === undefined) return;

    const updatedRuiJson = updateProperty(
      e,
      selectedComponent.id,
      selectedComponentInfo,
    )(screenStructure);

    if (updatedRuiJson !== screenStructure) {
      console.log("** Sending updated JSON to the extension **");
      postMessage({ type: CommandType.EDIT_COMMAND, data: updatedRuiJson });
    }
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
      const value = {
        value: options.rowData.value,
        exposedAsState: options.rowData.exposedAsState,
        ...options.value,
      };
      return (
        <>
          <TriStateCheckbox
            value={options.value}
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
  };

  return (
    <Pane>
      <Splitter>
        <SplitterPanel minSize={20}>
          dsdssd
          <Splitter layout={"vertical"}>
            <SplitterPanel minSize={10}>
              <Pane>
                <Panel header={"View"}>
                  <TabView>
                    <TabPanel header="Structure">
                      {screenStructure ? (
                        <ComponentTreeView
                          ruiComponents={screenStructure}
                          selectedComponent={setSelectedComponent}
                        />
                      ) : (
                        <ProgressSpinner />
                      )}
                    </TabPanel>
                    <TabPanel header="Interface"></TabPanel>
                  </TabView>
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
                  {Object.entries(componentsStructure).map(([k, _v]) => (
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
