import { useComponentState } from "~src/components/componentState";
import { Pane } from "~src/components/Pane";
import { Button } from "primereact/button";
import { Panel } from "primereact/panel";
import { Splitter, SplitterPanel } from "primereact/splitter";
import React, { useState } from "react";
import { TabPanel, TabView } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions, ColumnEvent } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { CodeHighlighter } from "./components/CodePreview";
import { TriStateCheckbox } from "primereact/tristatecheckbox";
import ComponentTreeView, {
  ComponentTreeNode,
} from "./components/ComponentTreeView";
import RuiComponents from "./data/ruiExample.json";
import {
  processComponentEvents,
  processComponentProps,
  updateNestedItemByKey,
} from "./utils";
import { CommandType, useVsCode } from "./hooks/useVsCode";
import { RuiJSONFormat } from "@rui/transform";

// Keeping this here for reference
type PropertyItem = {
  name: string;
  type: string;
  value: string | boolean | null | number;
};

const propertyList: PropertyItem[] = [
  { name: "id", type: "string", value: "button1" },
  { name: "caption", type: "string", value: "Demo Button" },
  { name: "shadow", type: "boolean", value: true },
  { name: "darkMode", type: "boolean", value: false },
  { name: "unset", type: "boolean", value: null },
];

const eventList: PropertyItem[] = [
  {
    name: "onClick",
    type: "functionRef",
    value: "button1Click",
  },
];

const mainScreen = () => {
  const user = useComponentState<string>("Initial value");

  // Only works when the app is running in VSCode
  const { postMessage } = useVsCode();

  const typescriptResult = `
    import { useComponentState } from "bar";
    
    const component = () => {
        const data = useComponentState<string>("Data");

        return (
            <div><p>hello: {data}</p></div>
        );
    }

    export default component;

  `;

  const [selectedComponent, setSelectedComponent] =
    useState<ComponentTreeNode | null>(null);

  const componentPropertyList = processComponentProps(
    selectedComponent?.data?.props,
  );
  const componentEventList = processComponentEvents(
    selectedComponent?.data?.events,
  );

  const onCellEditComplete = (e: ColumnEvent) => {
    const newRuiComponents: RuiJSONFormat = JSON.parse(
      JSON.stringify(RuiComponents),
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

  return (
    <Pane>
      <Splitter>
        <SplitterPanel minSize={20}>
          <Splitter layout={"vertical"}>
            <SplitterPanel minSize={10}>
              <Pane>
                <Panel header={"View"}>
                  <ComponentTreeView
                    ruiComponents={RuiComponents}
                    selectedComponent={setSelectedComponent}
                  />
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
          <Splitter>
            <SplitterPanel>
              <Pane>
                <CodeHighlighter code={typescriptResult} />
                <p>Center Panel: {user.value}</p>
                <Button
                  label={"Demo button"}
                  onClick={(event: React.MouseEvent): void => {
                    console.log("Woohoo", user.value);
                    user.value = "World";
                  }}
                />
              </Pane>
            </SplitterPanel>
            <SplitterPanel>
              <p>Right Panel</p>
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
      </Splitter>
    </Pane>
  );
};
export default mainScreen;
