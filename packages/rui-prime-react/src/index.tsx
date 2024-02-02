import { Panel as PrimeReactPanel } from "primereact/panel";
import { Button as PrimeReactButton } from "primereact/button";
import React from "react";
import type {
  VisualComponentDefinition,
  ComponentLibrary,
} from "@rui/transform";

const Panel: VisualComponentDefinition<
  { header: string },
  {},
  { children?: React.ReactNode }
> = {
  vc: (props) => (
    <PrimeReactPanel header={props.header}>{props.children}</PrimeReactPanel>
  ),
};

const Button: VisualComponentDefinition<
  { caption: string; disabled: boolean },
  { onClick: (event: React.MouseEvent) => void },
  {}
> = {
  vc: (props) => (
    <PrimeReactButton
      label={props.caption}
      onClick={props.onClick}
      disabled={props.disabled}
    />
  ),
};

const componentLibrary = {
  Panel,
  Button,
} as const satisfies ComponentLibrary;

export default componentLibrary;
