import React from "react";
import ManualScreen from "./ManualScreen";
import "primeicons/primeicons.css";
import { APIOptions, PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-light-purple/theme.css";

export const App = () => {
  const value: APIOptions = {
    pt: {
      panel: {
        header: { className: "p-4" },
      },
      tree: {
        root: { className: "p-1" },
        node: {
          className: "p-0",
        },
        content: {
          className: "p-0",
        },
        subgroup: {
          className: "p-l-0",
        },
      },
      tabview: {
        panelContainer: { className: "p-0 pt-2" },
      },
      tabpanel: {
        headerAction: { className: "p-2" },
      },
    },
  };
  return (
    <PrimeReactProvider value={value}>
      <ManualScreen />
    </PrimeReactProvider>
  );
};
