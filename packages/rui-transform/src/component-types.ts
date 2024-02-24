import { ReactNode } from "react";

export type ComponentDefinition<
  TProps = {},
  TEvents = {},
  TProduceResult = void,
  TChildren = {},
> = {
  description?: string;
} & (void extends TProduceResult
  ? {}
  : {
      produce: (
        props: Partial<TProps & TEvents> & { id: string },
      ) => TProduceResult;
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
  vc: (
    props: Partial<TProps & TEvents & TChildren> & {
      id: string;
    } & (void extends TProduceResult ? {} : { scopeResult: TProduceResult }),
  ) => ReactNode;
} & {
  //https://github.com/microsoft/TypeScript/issues/31940#issuecomment-839659248
  __RuiVisualComponentBrand?: undefined;
};

export type ComponentLibrary = Record<
  string,
  ComponentDefinition | VisualComponentDefinition
>;

type FilterEvents<TProps> =
  TProps extends Record<string, unknown>
    ? {
        [Key in keyof TProps]: Key extends `on${string}` ? Key : never;
      }[keyof TProps]
    : never;

export type PropertiesOf<
  TComponent extends VisualComponentDefinition | ComponentDefinition,
> = TComponent extends { vc: (args: infer TArgs) => any }
  ? Required<Omit<TArgs, FilterEvents<TArgs>>>
  : TComponent extends { produce: (args: infer TArgs) => any }
    ? Required<Omit<TArgs, FilterEvents<TArgs>>>
    : never;

export type EventsOf<
  TComponent extends VisualComponentDefinition | ComponentDefinition,
> = TComponent extends { vc: (args: infer TArgs) => any }
  ? Required<Pick<TArgs, FilterEvents<TArgs>>>
  : TComponent extends { produce: (args: infer TArgs) => any }
    ? Required<Pick<TArgs, FilterEvents<TArgs>>>
    : never;

export type ComponentProductRef<TComponentProduct> = TComponentProduct & {
  __ComponentRef?: any;
};
