/**
 * This is an auto generated file. DO NOT EDIT MANUALLY.
 * Please use our Editor plugin to edit this file.
 * For more information about Rapid UI, see: ....
 **/
import React from "react";
import {
  type PropertiesOf,
  type EventsOf,
  exposePropsAsState,
  composeDataChildren,
} from "@rui/transform";
import Components, { TAction } from "../rapid-components";
import eventHandlers from "./ExperimentScreen2.events";

type CL = typeof Components;
type CProps<TComponentName extends keyof CL> = Partial<
  PropertiesOf<CL[TComponentName]>
>;
type CEvents<TComponentName extends keyof CL> = Partial<
  EventsOf<CL[TComponentName]>
>;

export type Scope = {
  readonly user: {
    value: string;
  };
  readonly actionList1: {
    actions: {
      action1: TAction;
    };
  };
} & {
  readonly text1: {
    content?: string;
  };
  readonly button1: {
    disabled?: boolean;
  };
};

export const MainScreen = () => {
  const Panel1 = Components.Panel.vc;
  const Text1 = Components.Text.vc;
  const Button1 = Components.Button.vc;
  const ActionButton1 = Components.ActionButton.vc;
  const properties = {
    User: {
      initialValue: "Hello World",
    } satisfies CProps<"ComponentState">,
    Panel1: {
      header: "Hello",
    } satisfies CProps<"Panel">,
    Text1: {
      content: "Hello world",
    } satisfies CProps<"Text">,
    Button1: {
      caption: "Press me",
    } satisfies CProps<"Button">,
    ActionButton1: {
      caption: "Disable other",
    } satisfies CProps<"ActionButton">,
    Action1: {
      caption: "Button!",
      disabled: false,
    } satisfies CProps<"Action">,
  };
  const events = {
    Button1: {
      onClick: (event: React.MouseEvent) =>
        eventHandlers(scope).button1Click(event),
    } satisfies CEvents<"Button">,
    Action1: {
      onExecute: () => eventHandlers(scope).action1Execute(),
    } satisfies CEvents<"Action">,
  };
  const scope: Scope = {
    user: Components.ComponentState.produce({ ...properties.User }),
    text1: exposePropsAsState({}, properties.Text1, "content"),
    button1: exposePropsAsState(
      {},
      properties.Button1 as CProps<"Button">,
      "disabled",
    ),
    actionList1: composeDataChildren(
      {},
      {
        actions: {
          action1: Components.Action.produce({
            ...properties.Action1,
            ...events.Action1,
          }),
        },
      },
    ),
  };

  return (
    <Panel1 {...properties.Panel1}>
      <Text1 {...properties.Text1} {...scope.text1} />
      <Button1 {...properties.Button1} {...scope.button1} {...events.Button1} />
      <ActionButton1
        {...properties.ActionButton1}
        action={scope.actionList1.actions.action1}
      />
    </Panel1>
  );
};
