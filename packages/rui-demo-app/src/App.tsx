import React from "react";
import { PrimeReactProvider } from "primereact/api";
import { NewScreen } from "./NewScreen.rui";
import "primereact/resources/themes/lara-light-purple/theme.css";

export const App = () => {
  return (
    <PrimeReactProvider>
      <NewScreen />
    </PrimeReactProvider>
  );
};
