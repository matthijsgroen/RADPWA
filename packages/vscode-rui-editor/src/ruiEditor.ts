import * as vscode from "vscode";
import { getNonce } from "./utils";
import ts from "typescript";
import {
  type ComponentLibraryMetaInformation,
  type RuiJSONFormat,
  convertRuiToJson,
  getProjectComponentsFromType,
  convertJsonToRui,
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

    vscode.workspace
      .findFiles("rapid-components.tsx", undefined, 1)
      .then((result) => {
        const libPath = result[0].fsPath;

        const host = ts.createCompilerHost({ rootDir: "." });
        const program = ts.createProgram({
          rootNames: [document.fileName, libPath],
          options: { rootDir: "." },
          host,
        });
        const vcl = getProjectComponentsFromType(program, libPath);
        const safeVCL = JSON.parse(
          JSON.stringify(vcl, (key, value) => {
            if (value && typeof value === "object" && ts.isTypeNode(value)) {
              return undefined;
            }
            return value;
          }),
        );

        webviewPanel.webview.options = {
          enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(
          webviewPanel.webview,
        );

        // Receive message from the webview.
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
          switch (message.type.toString()) {
            case "EDIT_COMMAND":
              const receivedData = message.data;
              console.log("** Received updated JSON from the webview **");
              const Rui = await convertJsonToRui(receivedData, vcl);
              this.editDocument(webviewPanel, document, Rui, vcl);
              return;
          }
        });

        const changeDocumentSubscription =
          vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
              this.updateWebview(webviewPanel, document, vcl, safeVCL);
            }
          });
        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
          changeDocumentSubscription.dispose();
        });

        setTimeout(() => {
          this.updateWebview(webviewPanel, document, vcl, safeVCL);
        }, 500);
      });
  }

  private updateWebview(
    webviewPanel: vscode.WebviewPanel,
    document: vscode.TextDocument,
    vcl: ComponentLibraryMetaInformation,
    safeVcl: ComponentLibraryMetaInformation,
  ) {
    console.log("** Updating webview **");
    webviewPanel.webview.postMessage({
      type: "UPDATE_COMPONENTS",
      data: safeVcl,
    });
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
    Rui: string,
    vcl: ComponentLibraryMetaInformation,
  ) {
    const edit = new vscode.WorkspaceEdit();

    console.log("** Replacing document **");

    // Replace the entire document
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      Rui,
    );

    // Apply the edits
    vscode.workspace.applyEdit(edit);

    // Update the webview
    // this.updateWebview(webviewPanel, document, vcl, sav);

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
