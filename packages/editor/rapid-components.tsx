import React, { useState } from "react";
import { useComponentState } from "./src/components/componentState";
import type {
  VisualComponentDefinition,
  ComponentDefinition,
  ComponentLibrary,
  ComponentProductRef,
} from "@rui/transform";

import PrimeReactComponents from "@rui/prime-react";

const ComponentState: ComponentDefinition<
  { initialValue: string },
  {},
  { value: string }
> = {
  produce: (props) => useComponentState(props.initialValue ?? ""),
};

const Text: VisualComponentDefinition<{ content: string }> = {
  vc: (props) => <p>{props.content}</p>,
};

export type TAction = {
  caption: string;
  icon: string;
  disabled: boolean;
  busy: boolean;
  execute: () => Promise<void>;
};

const Action: ComponentDefinition<
  { caption: string; icon: string; disabled: boolean },
  { onExecute: () => Promise<void> },
  TAction
> = {
  produce: (props) => {
    const [busy, setBusy] = useState(false);
    return {
      caption: "NewAction",
      icon: "",
      disabled: false,
      busy,
      execute: async () => {
        setBusy(true);
        // Could trigger an onStart event
        await props.onExecute?.();
        // Could trigger an onFinished event
        setBusy(false);
      },
      ...props,
    };
  },
};

const ActionList: ComponentDefinition<{}, {}, {}, { actions: TAction }> = {
  produce: (props) => {
    return {};
  },
};

const ActionButton: VisualComponentDefinition<
  {
    action: ComponentProductRef<TAction>;
    caption: string;
    disabled: boolean;
    icon: string;
  },
  { onClick: (event: React.MouseEvent) => void }
> = {
  vc: (props) => {
    const caption = props.action ? props.action.caption : props.caption;
    const disabled = props.action ? props.action.disabled : props.disabled;
    const busy = props.action ? props.action.busy : props.disabled;
    return (
      <button
        style={{
          backgroundColor: "pink",
          padding: "1rem",
          borderRadius: "5px",
        }}
        onClick={(e) => {
          props.action ? props.action.execute() : props.onClick?.(e);
        }}
        disabled={disabled}
      >
        {busy && "⏳"} {caption}
      </button>
    );
  },
};

const componentLibrary = {
  ...PrimeReactComponents,
  Action,
  ActionList,
  ActionButton,
  ComponentState,
  Text,
} as const satisfies ComponentLibrary;

export default componentLibrary;
