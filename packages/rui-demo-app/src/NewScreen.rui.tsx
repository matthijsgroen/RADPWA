/**
 * This is an auto generated file. DO NOT EDIT MANUALLY.
 * Please use our Editor plugin to edit this file.
 * For more information about Rapid UI, see: ....
 **/
import React from "react";
import {
  type EventsOf,
  type PropertiesOf,
  exposePropsAsState,
  composeDataChildren,
} from "@rui/transform";
import Components from "../rapid-components";
import eventHandlers from "./NewScreen.events";
type CL = typeof Components;
type CProps<TComponentName extends keyof CL> = Partial<
  PropertiesOf<CL[TComponentName]>
>;
type CEvents<TComponentName extends keyof CL> = Partial<
  EventsOf<CL[TComponentName]>
>;
export type Scope = {
  readonly text1: {
    content?: string;
  };
  readonly inputText1: {
    value: string;
    disabled?: boolean;
  } & {
    disabled?: boolean;
  };
  readonly updateButton: {
    disabled?: boolean;
  };
};
export const NewScreen: React.FC = () => {
  const Panel1 = Components.Panel.vc;
  const Column1 = Components.Column.vc;
  const Text1 = Components.Text.vc;
  const Row1 = Components.Row.vc;
  const InputText1 = Components.InputText.vc;
  const UpdateButton = Components.Button.vc;
  const UnlockButton = Components.Button.vc;
  const properties = {
    Panel1: {
      header: "RAD PWA Demo",
    } satisfies CProps<"Panel">,
    Text1: {
      content: "Lorem ipsum dolor sit",
    } satisfies CProps<"Text">,
    InputText1: {
      disabled: true,
    } satisfies CProps<"InputText">,
    UpdateButton: {
      caption: "Update",
      disabled: true,
    } satisfies CProps<"Button">,
    UnlockButton: {
      caption: "Unlock!",
    } satisfies CProps<"Button">,
  };
  const events = {
    UpdateButton: {
      onClick: (event: React.MouseEvent) =>
        eventHandlers(scope).updateButtonClick(event),
    } satisfies CEvents<"Button">,
    UnlockButton: {
      onClick: (event: React.MouseEvent) =>
        eventHandlers(scope).unlockButtonClick(event),
    } satisfies CEvents<"Button">,
  };
  const scope: Scope = {
    text1: exposePropsAsState(
      {},
      properties.Text1 as CProps<"Text">,
      "content",
    ),
    inputText1: exposePropsAsState(
      Components.InputText.produce({
        id: "inputText1",
        ...properties.InputText1,
      }),
      properties.InputText1 as CProps<"InputText">,
      "disabled",
    ),
    updateButton: exposePropsAsState(
      {},
      properties.UpdateButton as CProps<"Button">,
      "disabled",
    ),
  };
  return (
    <Panel1 id="panel1" {...properties.Panel1}>
      <Column1 id="column1">
        <Text1 id="text1" {...properties.Text1} {...scope.text1} />
        <Row1 id="row1">
          <InputText1
            id="inputText1"
            scopeResult={scope.inputText1}
            {...properties.InputText1}
            scopeResult={scope.inputText1}
            {...scope.inputText1}
          />
          <UpdateButton
            id="updateButton"
            {...properties.UpdateButton}
            {...scope.updateButton}
            {...events.UpdateButton}
          />
          <UnlockButton
            id="unlockButton"
            {...properties.UnlockButton}
            {...events.UnlockButton}
          />
        </Row1>
      </Column1>
    </Panel1>
  );
};
