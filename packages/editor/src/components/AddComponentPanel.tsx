import {
  ComponentLibraryMetaInformation,
  ComponentMetaInformation,
} from "@rui/transform";
import { Button } from "primereact/button";
import { ListBox } from "primereact/listbox";
import React, { useState } from "react";

type Props = {
  componentLibrary: ComponentLibraryMetaInformation;
  nodeType: "visual" | "data";
  parentComponent?: string | null;
  containerName?: string | null;

  onComponentSelection?: (componentType: string) => void;
};

type Option = { name: string; info: ComponentMetaInformation };

export const AddComponentPanel: React.FC<Props> = ({
  componentLibrary,
  nodeType,
  parentComponent,
  containerName,
  onComponentSelection,
}) => {
  const requiredChildType =
    parentComponent &&
    containerName &&
    componentLibrary[parentComponent] &&
    componentLibrary[parentComponent].childContainers[containerName]
      .typeAsString;

  const options: Option[] = Object.entries(componentLibrary)
    .map(([name, info]) => ({
      name,
      info,
    }))
    .filter((item) => {
      const properType =
        (item.info.isVisual && nodeType === "visual") ||
        (!item.info.isVisual && nodeType === "data");

      if (properType && nodeType === "data" && requiredChildType) {
        return item.info.produces?.typeAsString === requiredChildType;
      }

      return properType;
    });

  const [selectedItem, setSelectedItem] = useState<Option | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ListBox
        options={options}
        optionLabel="name"
        value={selectedItem}
        itemTemplate={(item) => <>{item.name}</>}
        onChange={(e) => setSelectedItem(e.value)}
      />
      <Button
        label="Add"
        disabled={selectedItem === null}
        onClick={() =>
          selectedItem && onComponentSelection?.(selectedItem.name)
        }
      />
    </div>
  );
};
