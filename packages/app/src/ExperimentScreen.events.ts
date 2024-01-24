import type { Scope } from "./ExperimentScreen.rui";

export default (scope: Scope) => ({
  demoButtonClick: (event: React.MouseEvent): void => {
    console.log("Woohoo", scope.user.value);
    scope.user.value = "World";
  },
  button2Click: (event: React.MouseEvent): void => {
    console.log("hello!");
    scope.button1.disabled = true;
  },
});
