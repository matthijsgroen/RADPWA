import { ReactNode } from "react";

export type ComponentDefinition<
  TProps = {},
  TEvents = {},
  TProduceResult = void,
> = {
  description?: string;
} & (void extends TProduceResult
  ? {}
  : {
      produce: (props: Partial<TProps & TEvents>) => TProduceResult;
    }) & {
    //https://github.com/microsoft/TypeScript/issues/31940#issuecomment-839659248
    __RuiComponentBrand?: undefined;
  };

export type VisualComponentDefinition<
  TProps = {},
  TEvents = {},
  TChildren = {},
  TProduceResult = void,
> = ComponentDefinition<TProps, TEvents, TProduceResult> & {
  /**
   * Visual Component
   */
  vc: (props: Partial<TProps & TEvents & TChildren>) => ReactNode;
} & {
  //https://github.com/microsoft/TypeScript/issues/31940#issuecomment-839659248
  __RuiVisualComponentBrand?: undefined;
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
