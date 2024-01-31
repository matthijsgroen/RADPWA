import {
  ComponentLibraryMetaInformation,
  RuiDataComponent,
  RuiVisualComponent,
} from "./compiler-types";

export const isVisualComponent = (
  component: RuiDataComponent | RuiVisualComponent,
  vcl: ComponentLibraryMetaInformation,
): component is RuiVisualComponent => vcl[component.component].isVisual;
