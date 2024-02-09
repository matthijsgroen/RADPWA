import { RuiJSONFormat } from "@rui/transform";
import { produce } from "immer";
import { DataTableRowEditCompleteEvent } from "primereact/datatable";
import { createName } from "~src/utils/createName";

export const updateInterface = (e: DataTableRowEditCompleteEvent) =>
  produce<RuiJSONFormat>((draft) => {
    if (e.data.name !== e.newData.name) {
      delete draft.interface[e.data.name];

      draft.interface[e.newData.name] = {
        type: e.newData.type.type,
        dependencies: e.newData.type.dependencies,
        optional: e.newData.optional,
      };
    } else {
      draft.interface[e.newData.name].optional = e.newData.optional;
      if (e.data.type.type !== e.newData.type.type) {
        draft.interface[e.newData.name].type = e.newData.type.type;
        draft.interface[e.newData.name].dependencies =
          e.newData.type.dependencies;
      }
    }
  });

export const addPropertyToInterface = () =>
  produce<RuiJSONFormat>((draft) => {
    const name = createName("newProperty", Object.keys(draft.interface));

    draft.interface[name] = {
      type: "unknown",
      dependencies: [],
      optional: true,
    };
  });

export const removePropertyFromInterface = (name: string) =>
  produce<RuiJSONFormat>((draft) => {
    delete draft.interface[name];
  });
