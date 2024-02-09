import * as vscode from "vscode";
import { RuiEditorProvider } from "./ruiEditor";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(RuiEditorProvider.register(context));
  const command = "rui.showSource";

  const commandHandler = () => {
    const inputFile = vscode.window.tabGroups.activeTabGroup.activeTab
      ?.input as { viewType: string; uri: vscode.Uri } | undefined;

    if (!inputFile) {
      return;
    }

    vscode.workspace.openTextDocument(inputFile.uri).then((document) => {
      vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(command, commandHandler),
  );
}

export function deactivate() {}
