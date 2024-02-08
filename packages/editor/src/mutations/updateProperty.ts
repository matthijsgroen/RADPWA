import {
  ComponentLibraryMetaInformation,
  ComponentMetaInformation,
  RuiDataComponent,
  RuiJSONFormat,
  RuiVisualComponent,
} from "@rui/transform";
import { produce } from "immer";
import { ColumnEvent } from "primereact/column";
import { traverse, treeSearch } from "./treeSearch";
import { isRef } from "~src/utils";

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

const updateComponentPropRefs = (
  previousId: string,
  newId: string,
  props: Record<string, any> | undefined,
  componentType: string,
  vcl: ComponentLibraryMetaInformation,
) => {
  if (props === undefined) return;
  const componentInfo = vcl[componentType];
  for (const key in props) {
    const propInfo = componentInfo.properties[key];

    if (isRef({ ...props[key], type: propInfo.typeAsString })) {
      const reference: string = props[key].ref;

      const updatedValue = reference
        .split(".")
        .map((v, i) => (i % 2 === 0 && v === previousId ? newId : v))
        .join(".");

      if (reference !== updatedValue) {
        props[key].ref = updatedValue;
      }
    }
  }
};

export const renameComponentId = (
  previousId: string,
  newId: string,
  vcl: ComponentLibraryMetaInformation,
) =>
  produce<RuiJSONFormat>((draft) => {
    traverse(draft.components, (component) => {
      if (component.id === previousId) {
        component.id = newId;
      }
      updateComponentPropRefs(
        previousId,
        newId,
        component.props,
        component.component,
        vcl,
      );
    });
    traverse(draft.composition, (component) => {
      if (component.id === previousId) {
        component.id = newId;
      }
      updateComponentPropRefs(
        previousId,
        newId,
        component.props,
        component.component,
        vcl,
      );
    });
  });
