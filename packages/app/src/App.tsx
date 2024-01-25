import React from "react";
// import Screen from "./user-interface.rui";
import ManualScreen from "./ManualScreen";

import { MainScreen } from "./ExperimentScreen.rui";

import { PrimeReactProvider } from "primereact/api";
// import "primereact/resources/themes/bootstrap4-dark-blue/theme.css";
import "primereact/resources/themes/lara-light-purple/theme.css";

import ComponentLibrary from "./data/componentLibraryExample.json";
import RuiComponents from "./data/ruiExample.json";

export const App = () => {
  return (
    <PrimeReactProvider>
      {/* <MainScreen /> */}
      <ManualScreen
        componentLibrary={ComponentLibrary}
        ruiComponents={RuiComponents}
      />
    </PrimeReactProvider>
  );
};
