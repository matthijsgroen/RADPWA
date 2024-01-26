import React from "react";
import { useComponentState } from "./src/components/componentState";
import type {
  VisualComponentDefinition,
  ComponentDefinition,
  ComponentLibrary,
} from "@rui/transform";

import PrimeReactComponents from "@rui/prime-react";

const ComponentState: ComponentDefinition<
  { initialValue: string },
  {},
  { value: string }
> = {
  produce: (props) => useComponentState(props.initialValue ?? ""),
};

const Text: VisualComponentDefinition<
  { content: string },
  {},
  {},
  { content: string }
> = {
  vc: (props) => <p>{props.content}</p>,
  produce: (props) => {
    const contentState = useComponentState(props.content ?? "");
    return {
      ...props,
      get content() {
        return contentState.value;
      },
      set content(newValue: string) {
        contentState.value = newValue;
      },
    };
  },
};

const componentLibrary = {
  ...PrimeReactComponents,
  ComponentState,
  Text,
} as const satisfies ComponentLibrary;

export default componentLibrary;
