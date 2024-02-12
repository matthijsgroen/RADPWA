import React from "react";
import { MainScreen } from "./ExperimentScreen.rui";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-light-purple/theme.css";

export const App = () => {
  return (
    <PrimeReactProvider>
      <MainScreen />
    </PrimeReactProvider>
  );
};
