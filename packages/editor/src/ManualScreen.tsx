import { Pane } from "~src/components/Pane";
import { Panel } from "primereact/panel";
import { Splitter, SplitterPanel } from "primereact/splitter";
import React, { useState } from "react";
import { TabPanel, TabView } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEvent } from "primereact/column";
import { Dialog } from "primereact/dialog";
import ComponentTreeView from "./components/ComponentTreeView";
import { PrimeIcons } from "primereact/api";
import {
  PropertyItem,
  isFunction,
  isRef,
  processComponentEvents,
  processComponentProps,
} from "./utils";
import { CommandType, useVsCode } from "./hooks/useVsCode";
import {
  ComponentLibraryMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiTypeDeclaration,
  RuiVisualComponent,
} from "@rui/transform";
import { ProgressSpinner } from "primereact/progressspinner";
import { renameComponentId, updateProperty } from "./mutations/updateProperty";
import { treeSearch } from "./mutations/treeSearch";
import { CodeHighlighter } from "./components/CodePreview";
import { propertyEdit } from "./propertyEdit";
import {
  cellBooleanEditor,
  cellIntelliSenseType,
  cellTextEditor,
} from "./cellEditors";
import {
  addPropertyToInterface,
  removePropertyFromInterface,
  updateInterface,
} from "./mutations/updateInterface";
import { Button } from "primereact/button";
import { useVsCodeState } from "./hooks/useVsCodeState";
import { ListBox } from "primereact/listbox";
import { AddComponentPanel } from "./components/AddComponentPanel";
import { addComponentToStructure } from "./mutations/addComponent";

const stringValue = (
  data: PropertyItem,
  component: RuiDataComponent | RuiVisualComponent | undefined,
  onOpenExternal?: (type: "function", name: string) => void,
): React.ReactNode => {
  const stateMarker = data.exposedAsState ? "🗒️ " : "";
  if (data.name === "id") {
    return `${data.value}`;
  }
  if (data.type === "string") {
    return (
      <strong>
        {stateMarker}
        {`${data.value ?? ""}`}
      </strong>
    );
  }
  if (data.type === "boolean") {
    return (
      <strong>
        {stateMarker}
        {`${data.value ?? ""}`}
      </strong>
    );
  }

  if (isRef(data)) {
    return `${stateMarker}${data.value ? data.value.ref : ""}`;
  }
  if (isFunction(data) && component !== undefined) {
    return (
      <div className="flex flex-row place-items-center">
        <div className="flex-1">
          {stateMarker}
          {`${data.value ?? ""}`}{" "}
        </div>
        {onOpenExternal && data.value && (
          <Button
            icon={PrimeIcons.ARROW_RIGHT}
            severity="secondary"
            rounded
            link
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenExternal("function", data.value);
            }}
          />
        )}
      </div>
    );
  }

  return `${stateMarker}${data.value} - ${data.type}`;
};

const getComponentById = (
  componentId: string | null,
  screenStructure: RuiJSONFormat | undefined,
): RuiDataComponent | RuiVisualComponent | undefined =>
  componentId
    ? treeSearch(componentId, screenStructure?.components ?? []) ||
      treeSearch(componentId, screenStructure?.composition ?? [])
    : undefined;

const mainScreen = () => {
  // Only works when the app is running in VSCode
  const { postMessage } = useVsCode();

  const {
    selectedComponentId,
    setSelectedComponentId,
    screenStructure,
    scopeType,
    componentsStructure,
    viewTreeState,
    setViewTreeState,
    activeObjectTab,
    setActiveObjectTab,
    activeStructureTab,
    setActiveStructureTab,
  } = useVsCodeState<{
    selectedComponentId: string | null;
    screenStructure: RuiJSONFormat | undefined;
    scopeType: string;
    componentsStructure: ComponentLibraryMetaInformation | undefined;
    viewTreeState: Record<string, boolean>;
    activeStructureTab: number;
    activeObjectTab: number;
  }>(
    {
      selectedComponentId: null,
      screenStructure: undefined,
      scopeType: "",
      componentsStructure: undefined,
      viewTreeState: {},
      activeObjectTab: 0,
      activeStructureTab: 0,
    },
    {
      UPDATE_COMMAND: "screenStructure",
      UPDATE_SCOPE_TYPE: "scopeType",
      UPDATE_COMPONENTS: "componentsStructure",
    },
  );

  const selectedComponent = getComponentById(
    selectedComponentId,
    screenStructure,
  );

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

  const componentInterfaceList: {
    name: string;
    type: RuiTypeDeclaration;
    optional: boolean;
  }[] = Object.entries(screenStructure?.interface ?? {}).map(
    ([name, value]) => ({
      name,
      type: {
        type: value.type,
        dependencies: value.dependencies,
        optional: false,
      },
      optional: value.optional,
    }),
  );

  const mutateScreenStructure = (
    mutation: (input: RuiJSONFormat) => RuiJSONFormat,
  ) => {
    if (screenStructure === undefined) return;
    const updatedRuiJson = mutation(screenStructure);

    if (updatedRuiJson !== screenStructure) {
      postMessage({ type: CommandType.EDIT_COMMAND, data: updatedRuiJson });
    }
  };

  const onCellEditComplete = (e: ColumnEvent) => {
    if (selectedComponent === undefined || componentsStructure === undefined)
      return;

    if (e.rowData.name === "id") {
      const newId = e.newValue.value;
      mutateScreenStructure(
        renameComponentId(e.rowData.value, newId, componentsStructure),
      );
      setSelectedComponentId(newId);
    } else {
      mutateScreenStructure(
        updateProperty(e, selectedComponent.id, selectedComponentInfo),
      );
    }
  };

  const openExternal = (type: "function", name: string) => {
    postMessage({ type: CommandType.OPEN_FUNCTION, data: name });
  };

  const [addDialogOpen, setAddDialogOpen] = useState<
    | { open: false }
    | {
        open: true;
        parentComponent: null | string;
        containerName: string;
        nodeType: "data" | "visual";
      }
  >({
    open: false,
  });

  return (
    <Pane>
      <Splitter layout={"horizontal"}>
        <SplitterPanel minSize={10}>
          <Pane>
            <Panel header={"View"}>
              <TabView
                activeIndex={activeStructureTab}
                onTabChange={(e) => setActiveStructureTab(e.index)}
              >
                <TabPanel header="Structure">
                  {screenStructure &&
                    componentsStructure &&
                    Object.keys(componentsStructure).length > 0 && (
                      <ComponentTreeView
                        ruiComponents={screenStructure}
                        viewTreeState={viewTreeState}
                        vcl={componentsStructure}
                        setVewTreeState={setViewTreeState}
                        selectedComponent={setSelectedComponentId}
                        onAddNodeClick={(parent, container, nodeType) => {
                          setAddDialogOpen({
                            open: true,
                            parentComponent: parent,
                            containerName: container,
                            nodeType,
                          });
                        }}
                      />
                    )}
                  {screenStructure &&
                    componentsStructure &&
                    Object.keys(componentsStructure).length === 0 && (
                      <p>
                        No component library found. Please create a{" "}
                        <code>rapid-components.tsx</code> file in the root of
                        your package
                      </p>
                    )}
                  {!screenStructure && <ProgressSpinner />}
                </TabPanel>
                <TabPanel header="Interface">
                  <DataTable
                    value={componentInterfaceList}
                    size="small"
                    stripedRows
                    scrollable
                    scrollHeight="100%"
                    editMode="row"
                    onRowEditComplete={(event) =>
                      mutateScreenStructure(updateInterface(event))
                    }
                  >
                    <Column
                      field="name"
                      header="Name"
                      editor={(options) => cellTextEditor(options, "alphanum")}
                    ></Column>
                    <Column
                      field="type"
                      header="Type"
                      editor={(options) => cellIntelliSenseType(options)}
                      body={(e) => e.type.type}
                    ></Column>
                    <Column
                      field="optional"
                      header="Optional"
                      editor={(options) => cellBooleanEditor(options)}
                    ></Column>
                    <Column rowEditor={true}></Column>
                    <Column
                      body={(item) => (
                        <Button
                          icon={PrimeIcons.TRASH}
                          severity="secondary"
                          rounded
                          link
                          onClick={() =>
                            mutateScreenStructure(
                              removePropertyFromInterface(item.name),
                            )
                          }
                        />
                      )}
                    ></Column>
                  </DataTable>
                  <div className="flex flex-wrap justify-content-center gap-3 my-4">
                    <Button
                      rounded
                      icon={PrimeIcons.PLUS}
                      aria-label="Add interface property"
                      onClick={() => {
                        mutateScreenStructure(addPropertyToInterface());
                      }}
                    />
                  </div>
                  <CodeHighlighter code={scopeType} />
                </TabPanel>
              </TabView>
            </Panel>
          </Pane>
        </SplitterPanel>
        <SplitterPanel>
          <Panel
            header={`Inspector (${selectedComponent ? selectedComponent.id : "none"})`}
            className="w-full"
          >
            <TabView
              activeIndex={activeObjectTab}
              onTabChange={(e) => setActiveObjectTab(e.index)}
            >
              <TabPanel header="Properties">
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
                    body={(data) => stringValue(data, selectedComponent)}
                    editor={propertyEdit}
                    onCellEditComplete={onCellEditComplete}
                  ></Column>
                </DataTable>
              </TabPanel>
              <TabPanel header="Events">
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
                    body={(data) =>
                      stringValue(data, selectedComponent, openExternal)
                    }
                    editor={propertyEdit}
                    onCellEditComplete={onCellEditComplete}
                  ></Column>
                </DataTable>
              </TabPanel>
            </TabView>
          </Panel>
        </SplitterPanel>
      </Splitter>
      <Dialog
        visible={addDialogOpen.open}
        header={"Add component"}
        onHide={() => setAddDialogOpen({ open: false })}
      >
        {componentsStructure && addDialogOpen.open && (
          <AddComponentPanel
            componentLibrary={componentsStructure}
            nodeType={addDialogOpen.nodeType}
            parentComponent={
              addDialogOpen.parentComponent
                ? getComponentById(
                    addDialogOpen.parentComponent,
                    screenStructure,
                  )?.component
                : null
            }
            containerName={addDialogOpen.containerName}
            onComponentSelection={(componentType) => {
              // add componentType to child container
              mutateScreenStructure(
                addComponentToStructure(
                  componentType,
                  addDialogOpen.parentComponent,
                  addDialogOpen.containerName,
                  addDialogOpen.nodeType,
                ),
              );
              setAddDialogOpen({ open: false });
            }}
          />
        )}
      </Dialog>
    </Pane>
  );
};
export default mainScreen;
