import React from "react";
import { Dialog as PrimeDialog } from "primereact/dialog";
import { useDialog } from "./DialogContext";
import { ListBox } from "primereact/listbox";

const Dialog = () => {
  const { isVisible, dialogData, hideDialog } = useDialog();

  return (
    <PrimeDialog visible={isVisible} onHide={hideDialog}>
      {JSON.stringify(dialogData)}
    </PrimeDialog>
  );
};

export default Dialog;
