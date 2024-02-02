import type { Scope } from "./ExperimentScreen2.rui";

const wait = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

export default (scope: Scope) => ({
  button1Click: (event: React.MouseEvent): void => {
    console.log("Woohoo", scope.user.value);
    scope.text1.content = "UpdatedContent!";
  },
  button2Click: (event: React.MouseEvent): void => {
    console.log("hello!");
    scope.button1.disabled = true;
  },
  action1Execute: async (): Promise<void> => {
    console.log("hello from action!");
    await wait(1000);
    scope.button1.disabled = true;
  },
});
