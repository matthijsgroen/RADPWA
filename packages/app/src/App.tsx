import React from "react";
import Screen from "./user-interface.rui";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/bootstrap4-dark-blue/theme.css";

export const App = () => {
  return (
    <PrimeReactProvider>
      <Screen />
    </PrimeReactProvider>
  );
};
