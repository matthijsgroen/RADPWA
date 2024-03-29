import { RuiJSONFormat } from "@rui/transform";

export enum CommandType {
  EDIT_COMMAND = "EDIT_COMMAND",
  OPEN_FUNCTION = "OPEN_FUNCTION",
  CREATE_FUNCTION = "CREATE_FUNCTION",
}

type EditCommand = {
  type: CommandType.EDIT_COMMAND;
  data: RuiJSONFormat;
};

type OpenFunctionCommand = {
  type: CommandType.OPEN_FUNCTION;
  data: string;
};

type CreateFunctionCommand = {
  type: CommandType.CREATE_FUNCTION;
  data: {
    name?: string;
    component: string;
    componentId: string;
    event: string;
  };
};

// Only have one command type for now
type Command = EditCommand | OpenFunctionCommand | CreateFunctionCommand;

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
