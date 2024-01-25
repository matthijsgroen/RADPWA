import { useComponentState } from "~src/components/componentState";
import { Pane } from "~src/components/Pane";
import { useTreeData } from "~src/components/useTreeData";
import { Button } from "primereact/button";
import { Panel } from "primereact/panel";
import { Splitter, SplitterPanel } from "primereact/splitter";
import { Tree } from "primereact/tree";
import { TreeNode } from "primereact/treenode";
import React from "react";
import { TabPanel, TabView } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { CodeHighlighter } from "./components/CodePreview";
import { TriStateCheckbox } from "primereact/tristatecheckbox";

type PropertyItem = {
  name: string;
  type: string;
  value: string | boolean | null | number;
};

const mainScreen = () => {
  const user = useComponentState<string>("Initial value");
  const treeSource: TreeNode[] = useTreeData({
    getTreeData: async (): Promise<TreeNode[]> => {
      return [
        {
          label: "Splitter",
          children: [
            {
              label: "first",
              children: [{ label: "Tree" }, { label: "Button" }],
            },
            { label: "second" },
          ],
        },
      ];
    },
  });

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

  const postMessage = () => {
    if (!window.vscode) throw new Error("vscode is not defined");
    console.log("vscode: ", window.vscode);
    window.vscode.postMessage({
      type: "edit",
    });
  };

  return (
    <Pane>
      <Splitter>
        <SplitterPanel minSize={20}>
          <Splitter layout={"vertical"}>
            <SplitterPanel minSize={10}>
              <Pane>
                <Panel header={"View"}>
                  <Tree value={treeSource} />
                </Panel>
              </Pane>
            </SplitterPanel>
            <SplitterPanel>
              <Panel header={"Inspector"} className="w-full">
                <TabView>
                  <TabPanel header="Properties">
                    <DataTable
                      value={propertyList}
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
                          data.type === "string" ? data.value : `${data.value}`
                        }
                        editor={(options: ColumnEditorOptions) => {
                          if (options.rowData.type === "string") {
                            return <InputText value={options.value} />;
                          }
                          if (options.rowData.type === "boolean") {
                            return <TriStateCheckbox value={options.value} />;
                          }
                        }}
                      ></Column>
                    </DataTable>
                  </TabPanel>
                  <TabPanel header="Events">
                    <DataTable
                      value={eventList}
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
                          data.type === "string" ? data.value : `${data.value}`
                        }
                        editor={(options: ColumnEditorOptions) => (
                          <InputText value={options.value} />
                        )}
                      ></Column>
                    </DataTable>
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
                    postMessage();
                    // console.log("Woohoo", user.value);
                    // user.value = "World";
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
