/**
 * THIS IS AN AUTO GENERATED FILE. DO NOT EDIT.
 * USE VS-CODE Plugin .....
 */
import React from "react";
import { EventsOf, PropertiesOf } from "@rui/transform";
import Components from "../rapid-components";
import eventHandlers from "./ExperimentScreen.events";

type CL = typeof Components;

export type Scope = {
  readonly user: { value: string };
  readonly button1: { disabled: boolean };
  readonly button2: { disabled: boolean };
};

export const MainScreen = () => {
  const Button1 = Components.Button.vc;
  const Button2 = Components.Button.vc;
  const Panel1 = Components.Panel.vc;

  const properties = {
    Panel1: {
      header: "Hello",
    } satisfies PropertiesOf<CL["Panel"]>,
    User: {
      initialValue: "Hello World",
    } satisfies PropertiesOf<CL["ComponentState"]>,
    Button1: {
      caption: "Press me",
    } satisfies PropertiesOf<CL["Button"]>,
    Button2: { caption: "Disable other" } satisfies PropertiesOf<CL["Button"]>,
  };

  const events = {
    Button1: {
      onClick: (e: React.MouseEvent) => eventHandlers(scope).demoButtonClick(e),
    } satisfies EventsOf<(typeof Components)["Button"]>,
    Button2: {
      onClick: (e: React.MouseEvent) => eventHandlers(scope).button2Click(e),
    } satisfies EventsOf<(typeof Components)["Button"]>,
  };

  const scope: Scope = {
    user: Components.ComponentState.produce(properties.User),
    button1: Components.Button.produce?.({
      ...properties.Button1,
      ...events.Button1,
    }),
    button2: Components.Button.produce?.({
      ...properties.Button2,
      ...events.Button2,
    }),
  };

  return (
    <Panel1
      {...properties.Panel1}
      {...events.Panel1}
      children={
        <>
          <p>This is a test {scope.user.value}</p>
          <Button1
            {...properties.Button1}
            {...scope.button1}
            {...events.Button1}
          />
          <Button2
            {...properties.Button2}
            {...scope.button2}
            {...events.Button2}
          />
        </>
      }
    />
  );
};
