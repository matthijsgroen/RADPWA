import { Panel as PrimeReactPanel } from "primereact/panel";
import { Button as PrimeReactButton } from "primereact/button";
import React, { useState } from "react";
import type {
  VisualComponentDefinition,
  ComponentLibrary,
} from "@rui/transform";

const Panel: VisualComponentDefinition<
  { header: string },
  {},
  { children?: React.ReactNode },
  {}
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
    const [isDisabled, setIsDisabled] = useState(props.disabled ?? false);
    return {
      ...props,
      get disabled() {
        return isDisabled;
      },
      set disabled(newValue: boolean) {
        setIsDisabled(newValue);
      },
    };
  },
};

const componentLibrary = {
  Panel,
  Button,
} as const satisfies ComponentLibrary;

export default componentLibrary;
