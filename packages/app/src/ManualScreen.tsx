import { Pane } from "~src/components/Pane";
import { Panel } from "primereact/panel";
import { Splitter, SplitterPanel } from "primereact/splitter";
import React, { useEffect, useState } from "react";
import { TabPanel, TabView } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions, ColumnEvent } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { CodeHighlighter } from "./components/CodePreview";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import ComponentTreeView, {
  ComponentTreeNode,
} from "./components/ComponentTreeView";
import {
  processComponentEvents,
  processComponentProps,
  updateNestedItemByKey,
} from "./utils";
import { CommandType, useVsCode } from "./hooks/useVsCode";
import { ComponentLibraryMetaInformation, RuiJSONFormat } from "@rui/transform";
import { ProgressSpinner } from "primereact/progressspinner";

// Keeping this here for reference
type PropertyItem = {
  name: string;
  type: string;
  value: string | boolean | null | number;
};

const mainScreen = () => {
  // Only works when the app is running in VSCode
  const { postMessage } = useVsCode();

  const [selectedComponent, setSelectedComponent] =
    useState<ComponentTreeNode | null>(null);

  const [screenStructure, setScreenStructure] = useState<RuiJSONFormat>();
  const [componentsStructure, setComponentsStructure] =
    useState<ComponentLibraryMetaInformation>();

  const componentPropertyList = processComponentProps(
    selectedComponent?.data?.props,
  );
  const componentEventList = processComponentEvents(
    selectedComponent?.data?.events,
  );

  const onCellEditComplete = (e: ColumnEvent) => {
    if (e.newValue === e.rowData.value) return;

    const newRuiComponents: RuiJSONFormat = JSON.parse(
      JSON.stringify(screenStructure),
    );

    const isUpdated = updateNestedItemByKey(
      newRuiComponents,
      e.rowData.name,
      e.newValue,
    );

    if (isUpdated) {
      console.log("** Sending updated JSON to the extension **");
      postMessage({ type: CommandType.EDIT_COMMAND, data: newRuiComponents });
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
                    {selectedComponent && selectedComponent.data.props && (
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
                          field="value"
                          header="Value"
                          body={(data) =>
                            data.type === "string"
                              ? data.value
                              : `${data.value}`
                          }
                          editor={(options: ColumnEditorOptions) => {
                            if (options.rowData.type === "string") {
                              return (
                                <InputText
                                  value={options.value}
                                  onChange={(e) =>
                                    options.editorCallback!(e.target.value)
                                  }
                                />
                              );
                            }
                            if (options.rowData.type === "boolean") {
                              return (
                                <TriStateCheckbox
                                  value={options.value}
                                  onChange={(e) =>
                                    options.editorCallback!(e.target.value)
                                  }
                                />
                              );
                            }
                          }}
                          onCellEditComplete={onCellEditComplete}
                        ></Column>
                      </DataTable>
                    )}
                  </TabPanel>
                  <TabPanel header="Events">
                    {selectedComponent && selectedComponent.data.events && (
                      <DataTable
                        value={componentEventList}
                        size="small"
                        stripedRows
                        scrollable
                        scrollHeight="100%"
                      >
                        <Column field="name" header="Name"></Column>
                        <Column
                          field="value"
                          header="Value"
                          body={(data) =>
                            data.type === "string"
                              ? data.value
                              : `${data.value}`
                          }
                          editor={(options: ColumnEditorOptions) => (
                            <InputText
                              value={options.value}
                              onChange={(e) =>
                                options.editorCallback!(e.target.value)
                              }
                            />
                          )}
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
