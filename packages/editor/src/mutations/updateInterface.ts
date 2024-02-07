import { RuiJSONFormat } from "@rui/transform";
import { produce } from "immer";
import { DataTableRowEditCompleteEvent } from "primereact/datatable";

export const updateInterface = (e: DataTableRowEditCompleteEvent) =>
  produce<RuiJSONFormat>((draft) => {
    if (e.data.name !== e.newData.name) {
      delete draft.interface[e.data.name];

      draft.interface[e.newData.name] = {
        type: e.newData.type.name,
        dependencies: e.newData.type.dependencies,
        optional: e.newData.optional,
      };
    } else {
      draft.interface[e.newData.name].optional = e.newData.optional;
    }
  });
