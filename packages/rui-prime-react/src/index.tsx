import React from "react";

import type {
  VisualComponentDefinition,
  ComponentLibrary,
} from "@rui/transform";

import { Panel as PrimeReactPanel } from "primereact/panel";
import { Button as PrimeReactButton } from "primereact/button";
import {
  RadioButton as PrimeReactRadioButton,
  RadioButtonChangeEvent,
} from "primereact/radiobutton";
import {
  ListBoxChangeEvent,
  ListBox as PrimeReactListbox,
} from "primereact/listbox";
import { InputText as PrimeReactInputText } from "primereact/inputtext";
import { SelectItemOptionsType } from "primereact/selectitem";

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

const RadioButton: VisualComponentDefinition<
  {
    inputId: string;
    name: string;
    value: string;
    disabled: boolean;
    checked: boolean;
  },
  { onChange: (event: RadioButtonChangeEvent) => void },
  {}
> = {
  vc: (props) => (
    <PrimeReactRadioButton
      inputId={props.inputId}
      name={props.name}
      value={props.value}
      disabled={props.disabled}
      checked={props.checked}
      onChange={props.onChange}
    />
  ),
};

const Listbox: VisualComponentDefinition<
  {
    name: string;
    value: string;
    options: SelectItemOptionsType;
    optionLabel: string;
  },
  { onChange: (event: ListBoxChangeEvent) => void },
  {}
> = {
  vc: (props) => (
    <PrimeReactListbox
      name={props.name}
      value={props.value}
      options={props.options}
      optionLabel={props.optionLabel}
      onChange={props.onChange}
    />
  ),
};

const InputText: VisualComponentDefinition<
  {
    name: string;
    value: string;
    disabled: boolean;
  },
  {
    onInput: (
      event: React.FormEvent<HTMLInputElement>,
      validatePattern: boolean,
    ) => void;
  },
  {}
> = {
  vc: (props) => (
    <PrimeReactInputText
      name={props.name}
      value={props.value}
      disabled={props.disabled}
      onInput={props.onInput}
    />
  ),
};

const componentLibrary = {
  Panel,
  Button,
  RadioButton,
  Listbox,
  InputText,
} as const satisfies ComponentLibrary;

export default componentLibrary;
