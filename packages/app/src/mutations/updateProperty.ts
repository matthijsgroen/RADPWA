import {
  ComponentMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { produce } from "immer";
import { ColumnEvent } from "primereact/column";
import { treeSearch } from "./treeSearch";

const updatePropsAsState = <T extends RuiDataComponent | RuiVisualComponent>(
  component: T,
  property: string,
  add: boolean,
) => {
  const propIndex = (component.propsAsState || []).indexOf(property);
  if (propIndex !== -1 && !add) {
    component.propsAsState?.splice(propIndex, 1);
  }
  if (propIndex === -1 && add) {
    component.propsAsState ??= [];
    component.propsAsState.push(property);
  }
};

export const updateProperty = (
  e: ColumnEvent,
  componentId: string,
  selectedComponentInfo: ComponentMetaInformation | undefined,
) =>
  produce<RuiJSONFormat>((draft) => {
    if (!selectedComponentInfo) {
      return;
    }
    if (selectedComponentInfo.isVisual) {
      // component is in the visual tree
      const component = treeSearch(componentId, draft.composition);
      const propName = e.rowData.name;
      if (e.newValue && component) {
        updatePropsAsState(component, propName, e.newValue.exposedAsState);

        component.props ??= {};
        component.props[propName] = e.newValue.value;
      }
    } else {
      // component is in the data tree
      const component = treeSearch(componentId, draft.components);
      const propName = e.rowData.name;
      if (e.newValue && component) {
        updatePropsAsState(component, propName, e.newValue.exposedAsState);

        component.props ??= {};
        component.props[propName] = e.newValue.value;
      }
    }
  });
