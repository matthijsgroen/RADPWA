import * as vscode from "vscode";
import { getNonce } from "./utils";
import ts from "typescript";
import {
  ComponentLibraryMetaInformation,
  RuiJSONFormat,
  convertRuiToJson,
  getProjectComponentsFromType,
} from "@rui/transform";

export class RuiEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private static readonly viewType = "ruiCustoms.ruiEditor";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new RuiEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      RuiEditorProvider.viewType,
      provider,
    );
    return providerRegistration;
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    // Open the document editor and custom text editor side by side
    vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);

    const host = ts.createCompilerHost({ rootDir: "." });
    const program = ts.createProgram({
      rootNames: [document.fileName, "./rapid-components.tsx"],
      options: { rootDir: "." },
      host,
    });
    const vcl = getProjectComponentsFromType(program, "./rapid-components.tsx");

    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type.toString()) {
        case "EDIT_COMMAND":
          const receivedData = message.data;
          console.log("** Received updated JSON from the webview **");
          this.editDocument(webviewPanel, document, receivedData, vcl);
          return;
      }
    });

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.updateWebview(webviewPanel, document, vcl);
        }
      },
    );
    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    setTimeout(() => {
      this.updateWebview(webviewPanel, document, vcl);
    }, 500);
  }

  private updateWebview(
    webviewPanel: vscode.WebviewPanel,
    document: vscode.TextDocument,
    vcl: ComponentLibraryMetaInformation,
  ) {
    console.log("** Updating webview **");
    webviewPanel.webview.postMessage({
      type: "UPDATE_COMMAND",
      data: this.getDocumentAsJson(document, vcl),
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const js = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "index.048cd1c8.js",
      ),
    );

    const css = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "index.59a8f4de.css",
      ),
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${css}" rel="stylesheet" />

				<title>RUI Editor</title>
			</head>
			<body>
        <div id="app" class="size-full"></div>  

        <script>
          window.vscode = acquireVsCodeApi();
        </script>
        <script nonce="${nonce}" src="${js}" defer=""></script>
			</body>
			</html>`;
  }

  private editDocument(
    webviewPanel: vscode.WebviewPanel,
    document: vscode.TextDocument,
    json: RuiJSONFormat,
    vcl: ComponentLibraryMetaInformation,
  ) {
    const edit = new vscode.WorkspaceEdit();

    console.log("** Replacing document **");

    // Replace the entire document
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(json, null, 2),
    );

    // Apply the edits
    vscode.workspace.applyEdit(edit);

    // Update the webview
    this.updateWebview(webviewPanel, document, vcl);

    console.log("** Updated succesfully **");
  }

  private getDocumentAsJson(
    document: vscode.TextDocument,
    vcl: ComponentLibraryMetaInformation,
  ): RuiJSONFormat {
    const text = document.getText();

    return convertRuiToJson(document.fileName, text, vcl);
  }
}
