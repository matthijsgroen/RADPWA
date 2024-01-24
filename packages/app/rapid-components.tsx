import { Panel as PrimeReactPanel } from "primereact/panel";
import { Button as PrimeReactButton } from "primereact/button";
import React, { ReactNode } from "react";
import { useComponentState } from "./src/components/componentState";
import type {
  VisualComponentDefinition,
  ComponentDefinition,
  ComponentLibrary,
} from "@rui/transform";

const Panel: VisualComponentDefinition<
  { header: string },
  {},
  { children?: ReactNode }
> = {
  vc: (props) => (
    <PrimeReactPanel header={props.header}>{props.children}</PrimeReactPanel>
  ),
};

const Button: VisualComponentDefinition<
  { caption: string; disabled: boolean },
  { onClick: (event: React.MouseEvent) => void },
  {},
  {
    disabled: boolean;
  }
> = {
  vc: (props) => (
    <PrimeReactButton
      label={props.caption}
      onClick={props.onClick}
      disabled={props.disabled}
    />
  ),
  produce: (props) => {
    const disabledState = useComponentState(props.disabled ?? false);
    return {
      ...props,
      get disabled() {
        return disabledState.value;
      },
      set disabled(newValue: boolean) {
        disabledState.value = newValue;
      },
    };
  },
};

const ComponentState: ComponentDefinition<
  { initialValue: string },
  {},
  { value: string }
> = {
  produce: (props) => useComponentState(props.initialValue ?? ""),
};

const componentLibrary = {
  Panel,
  Button,
  ComponentState,
} as const satisfies ComponentLibrary;

export default componentLibrary;
