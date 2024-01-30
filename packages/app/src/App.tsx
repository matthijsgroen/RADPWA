import React from "react";
// import Screen from "./user-interface.rui";
import ManualScreen from "./ManualScreen";

import { MainScreen } from "./ExperimentScreen.rui";

import { PrimeReactProvider } from "primereact/api";
// import "primereact/resources/themes/bootstrap4-dark-blue/theme.css";
import "primereact/resources/themes/lara-light-purple/theme.css";

export const App = () => {
  return (
    <PrimeReactProvider>
      {/* <MainScreen /> */}
      <ManualScreen />
    </PrimeReactProvider>
  );
};
