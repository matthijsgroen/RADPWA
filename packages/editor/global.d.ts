type VSCode = {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

interface Window {
  vscode: VSCode;
}
