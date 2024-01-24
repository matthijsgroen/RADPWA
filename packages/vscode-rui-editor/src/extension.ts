import * as vscode from "vscode";
import { RuiEditorProvider } from "./ruiEditor";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(RuiEditorProvider.register(context));
}

export function deactivate() {}
