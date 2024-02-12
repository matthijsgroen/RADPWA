import * as vscode from "vscode";
import { getNonce } from "./utils";
import ts from "typescript";
import {
  type ComponentLibraryMetaInformation,
  type RuiJSONFormat,
  convertRuiToJson,
  getProjectComponentsFromType,
  convertJsonToRui,
  defineScopeType,
  getFlatComponentList,
} from "@rui/transform";
import getRelativePath from "get-relative-path";

const getEventHandlerFileUri = (
  document: vscode.TextDocument,
  handlerFileDefinition: string,
): vscode.Uri => {
  // TODO: Requires some major refactor and robustness..
  // This is just a quick hacky solution to get the proper file open for now

  const pathElements = handlerFileDefinition.split("/");
  const fileName = pathElements.at(-1);
  const path = document.uri.path.split("/");
  path.pop();
  path.push(`${fileName}.ts`);

  return vscode.Uri.file(path.join("/"));
};

export class RuiEditorProvider implements vscode.CustomTextEditorProvider {
  private printer: ts.Printer;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.printer = ts.createPrinter();
  }

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
    vscode.workspace
      .findFiles("rapid-components.tsx", undefined, 1)
      .then((result) => {
        const libPath = result[0]?.fsPath;
        const componentsPath: string | null = libPath
          ? getRelativePath(document.fileName, libPath).slice(0, -4)
          : null;

        const host = ts.createCompilerHost({ rootDir: "." });
        const program = ts.createProgram({
          rootNames: libPath
            ? [document.fileName, libPath]
            : [document.fileName],
          options: { rootDir: "." },
          host,
        });

        const vcl = libPath
          ? getProjectComponentsFromType(program, libPath)
          : {};
        const safeVCL = vcl
          ? JSON.parse(
              JSON.stringify(vcl, (key, value) => {
                if (
                  value &&
                  typeof value === "object" &&
                  ts.isTypeNode(value)
                ) {
                  return undefined;
                }
                return value;
              }),
            )
          : {};

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
              this.editDocument(document, Rui);
              return;
            case "OPEN_FUNCTION":
              const functionName = message.data;
              console.log(
                "** Received request to open function **",
                functionName,
              );

              const jsonDocument = this.getDocumentAsJson(
                document,
                vcl,
                componentsPath,
              );

              if (jsonDocument.eventHandlers === null) {
                // Generate event file
                return;
              }

              const uri = getEventHandlerFileUri(
                document,
                jsonDocument.eventHandlers,
              );
              let doc = await vscode.workspace.openTextDocument(uri);
              vscode.window
                .showTextDocument(doc, vscode.ViewColumn.Beside)
                .then(() => {
                  vscode.commands.executeCommand(
                    "workbench.action.quickOpen",
                    `@${functionName}`,
                  );
                });

              return;
          }
        });

        const changeDocumentSubscription =
          vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
              this.updateWebview(
                webviewPanel,
                document,
                vcl,
                safeVCL,
                componentsPath,
              );
            }
          });
        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
          changeDocumentSubscription.dispose();
        });

        setTimeout(() => {
          this.updateWebview(
            webviewPanel,
            document,
            vcl,
            safeVCL,
            componentsPath,
          );
        }, 500);
      });
  }

  private updateWebview(
    webviewPanel: vscode.WebviewPanel,
    document: vscode.TextDocument,
    vcl: ComponentLibraryMetaInformation,
    safeVcl: ComponentLibraryMetaInformation,
    componentsPath: string | null,
  ) {
    console.log("** Updating webview **");
    webviewPanel.webview.postMessage({
      type: "UPDATE_COMPONENTS",
      data: safeVcl,
    });
    const jsonDocument = this.getDocumentAsJson(document, vcl, componentsPath);
    webviewPanel.webview.postMessage({
      type: "UPDATE_COMMAND",
      data: jsonDocument,
    });
    const componentList = getFlatComponentList(jsonDocument);
    const scopeType = defineScopeType(componentList, vcl, false, false);
    const typeInfo = this.printer.printNode(
      ts.EmitHint.Unspecified,
      scopeType,
      ts.createSourceFile("t.tsx", "", ts.ScriptTarget.Latest),
    );

    webviewPanel.webview.postMessage({
      type: "UPDATE_SCOPE_TYPE",
      data: typeInfo,
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const js = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "index.e3dcddad.js",
      ),
    );

    const css = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "index.6fc39b01.css",
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

  private editDocument(document: vscode.TextDocument, Rui: string) {
    const edit = new vscode.WorkspaceEdit();

    // Replace the entire document
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      Rui,
    );

    // Apply the edits
    vscode.workspace.applyEdit(edit);
  }

  private getDocumentAsJson(
    document: vscode.TextDocument,
    vcl: ComponentLibraryMetaInformation,
    componentsPath: string | null,
  ): RuiJSONFormat {
    const text = document.getText();

    const result = convertRuiToJson(document.fileName, text, vcl);
    if (result.componentLibrary === null && componentsPath) {
      result.componentLibrary = componentsPath;
    }

    if (text.trim() === "") {
      // initialize document
      convertJsonToRui(result, vcl).then((tsxCode) => {
        this.editDocument(document, tsxCode);
      });
    }

    return result;
  }
}
