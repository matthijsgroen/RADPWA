import * as vscode from "vscode";
import { getNonce } from "./utils";

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

    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "edit":
          const receivedData = message.data;
          console.log("** Received updated JSON from the webview **");
          this.editDocument(document, receivedData);
          return;
      }
    });

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.getHtmlForWebview(webviewPanel.webview);
        }
      },
    );
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

  private editDocument(document: vscode.TextDocument, json: any) {
    const edit = new vscode.WorkspaceEdit();

    console.log("** Replacing document **");

    // Replace the entire document every time for this example.
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(json, null, 2),
    );

    console.log("** Updated succesfully **");

    return vscode.workspace.applyEdit(edit);
  }
}
