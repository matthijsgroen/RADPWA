import { ComponentDefinition } from "../component-types";

type ChildModelOf<TComponent extends ComponentDefinition> =
  TComponent extends ComponentDefinition<any, any, any, infer TChildren>
    ? {
        [Key in keyof TChildren]: { [k: string]: TChildren[Key] };
      }
    : never;

export const composeDataChildren = <
  TOriginal,
  TChildModel extends ChildModelOf<ComponentDefinition>,
>(
  original: TOriginal,
  children: TChildModel,
): TOriginal & TChildModel =>
  Object.defineProperties(
    original,
    Object.getOwnPropertyDescriptors(children),
  ) as TOriginal & TChildModel;
