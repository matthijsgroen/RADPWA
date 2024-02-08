import { RuiJSONFormat } from "@rui/transform";

export enum CommandType {
  EDIT_COMMAND = "EDIT_COMMAND",
}

type EditCommand = {
  type: CommandType.EDIT_COMMAND;
  data: RuiJSONFormat;
};

// Only have one command type for now
type Command = EditCommand;

export const useVsCode = () => {
  // TODO: What do we do if vscode is not defined?
  // if (!window.vscode) throw new Error("VSCode is not defined");

  const postMessage = (message: Command) => {
    console.log(message);
    window.vscode.postMessage(message);
  };

  const getState = () => window.vscode.getState();
  const setState = (state: any) => window.vscode.setState(state);

  return { postMessage, getState, setState };
};
