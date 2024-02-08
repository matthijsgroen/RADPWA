import { createRoot } from "react-dom/client";
import { App } from "./App";
import React from "react";
import "primeicons/primeicons.css";

const container = document.getElementById("app") as HTMLElement;
const root = createRoot(container);
root.render(<App />);
