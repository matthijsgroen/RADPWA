import { ComponentLibraryMetaInformation } from "@rui/transform";
import React, { createContext, useContext, ReactNode, useState } from "react";

type DialogContextType = {
  isVisible: boolean;
  dialogData?: ComponentLibraryMetaInformation;
  showDialog: (data: ComponentLibraryMetaInformation) => void;
  hideDialog: () => void;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

type DialogProviderProps = {
  children: ReactNode;
};

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [dialogData, setDialogData] =
    useState<ComponentLibraryMetaInformation>();

  const showDialog = (data: ComponentLibraryMetaInformation) => {
    setDialogData(data);
    setIsVisible(true);
  };

  const hideDialog = () => setIsVisible(false);

  return (
    <DialogContext.Provider
      value={{ isVisible, dialogData, showDialog, hideDialog }}
    >
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
};
