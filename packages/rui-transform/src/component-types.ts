import { ReactNode } from "react";

export type ComponentDefinition<
  TProps = {},
  TEvents = {},
  TProduceResult = void,
> = {
  produce: (props: Partial<TProps & TEvents>) => TProduceResult;
};

export type VisualComponentDefinition<
  TProps = {},
  TEvents = {},
  TChildren = {},
  TProduceResult = void,
> = Partial<ComponentDefinition<TProps, TEvents, TProduceResult>> & {
  /**
   * Visual Component
   */
  vc: (props: Partial<TProps & TEvents & TChildren>) => ReactNode;
};

export type ComponentLibrary = Record<
  string,
  ComponentDefinition | VisualComponentDefinition
>;

export type PropertiesOf<
  TComponent extends VisualComponentDefinition | ComponentDefinition,
> = Partial<
  TComponent extends ComponentDefinition<infer TProps>
    ? TProps
    : TComponent extends VisualComponentDefinition<infer TProps>
      ? TProps
      : never
>;

export type EventsOf<
  TComponent extends VisualComponentDefinition | ComponentDefinition,
> = Partial<
  TComponent extends ComponentDefinition<{}, infer TEvents>
    ? TEvents
    : TComponent extends VisualComponentDefinition<{}, infer TEvents>
      ? TEvents
      : never
>;
