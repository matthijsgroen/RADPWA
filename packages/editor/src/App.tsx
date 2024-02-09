import React from "react";
import ManualScreen from "./ManualScreen";
import "primeicons/primeicons.css";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-light-purple/theme.css";

export const App = () => {
  return (
    <PrimeReactProvider>
      <ManualScreen />
    </PrimeReactProvider>
  );
};
