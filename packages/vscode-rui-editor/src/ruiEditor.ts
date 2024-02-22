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
  ComponentMetaInformation,
  RuiDataComponent,
  RuiVisualComponent,
} from "@rui/transform";
import getRelativePath from "get-relative-path";
import { produce } from "immer";

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

export const selectAll = <R extends ts.Node>(
  nodes: ts.Node[],
  selector: readonly [...ts.SyntaxKind[], R["kind"]],
): R[] => {
  const [first, ...rest] = selector;

  const found: ts.Node[] = [];
  nodes.forEach((node) =>
    ts.forEachChild(node, (child) => {
      if (child.kind === first) {
        found.push(child);
      }
    }),
  );

  if (rest.length === 0 || found.length === 0) {
    return found as R[];
  }
  return selectAll(found, rest as [...ts.SyntaxKind[], R["kind"]]);
};

export const treeSearch = <T extends RuiDataComponent | RuiVisualComponent>(
  id: string,
  items: T[],
): T | undefined => {
  for (const i of items) {
    if (i.id === id) {
      return i;
    }
    if (i.childContainers) {
      for (const containerName in i.childContainers) {
        const result = treeSearch<T>(
          id,
          i.childContainers[containerName] as T[],
        );
        if (result) {
          return result;
        }
      }
    }
  }
};

const updateEvent = (
  name: string,
  callbackName: string,
  componentId: string,
  selectedComponentInfo: ComponentMetaInformation | undefined,
) =>
  produce<RuiJSONFormat>((draft) => {
    if (!selectedComponentInfo) {
      return;
    }
    if (selectedComponentInfo.isVisual) {
      // component is in the visual tree
      const component = treeSearch(componentId, draft.composition);
      if (component) {
        component.events ??= {};
        component.events[name] = callbackName;
      }
    } else {
      // component is in the data tree
      const component = treeSearch(componentId, draft.components);
      if (component) {
        component.events ??= {};
        component.events[name] = callbackName;
      }
    }
  });

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
              await this.editDocument(document, Rui);
              return;
            case "OPEN_FUNCTION": {
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
            case "CREATE_FUNCTION": {
              const createFunctionData = message.data;
              console.log(
                "** Received request to open function **",
                createFunctionData,
              );

              const jsonDocument = this.getDocumentAsJson(
                document,
                vcl,
                componentsPath,
              );

              let eventHandlerFile = jsonDocument.eventHandlers;
              if (eventHandlerFile === null) {
                // Generate event file
                const newHandlerFile = await this.createEventHandlerFile(
                  jsonDocument,
                  document,
                  vcl,
                );
                eventHandlerFile = newHandlerFile;
              }

              const setEventFile: RuiJSONFormat = updateEvent(
                createFunctionData.event,
                createFunctionData.name,
                createFunctionData.componentId,
                vcl[createFunctionData.component],
              )({
                ...jsonDocument,
                eventHandlers: eventHandlerFile,
              });
              const updatedContent = await convertJsonToRui(setEventFile, vcl);
              await this.editDocument(document, updatedContent);

              const uri = getEventHandlerFileUri(document, eventHandlerFile);
              let doc = await vscode.workspace.openTextDocument(uri);
              const sourceFile = ts.createSourceFile(
                "f.ts",
                doc.getText(),
                ts.ScriptTarget.Latest,
              );

              const compInfo = vcl[createFunctionData.component];
              const eventSignature =
                compInfo.events[createFunctionData.event].type;
              if (!eventSignature || !ts.isFunctionTypeNode(eventSignature)) {
                return;
              }

              const existingFunctionHandlers =
                selectAll<ts.ObjectLiteralExpression>(
                  [sourceFile],
                  [
                    ts.SyntaxKind.ExportAssignment,
                    ts.SyntaxKind.ArrowFunction,
                    ts.SyntaxKind.ParenthesizedExpression,
                    ts.SyntaxKind.ObjectLiteralExpression,
                  ],
                )[0];

              const updatedHandlers = ts.factory.createObjectLiteralExpression([
                ...existingFunctionHandlers.properties,
                ts.factory.createPropertyAssignment(
                  createFunctionData.name,
                  ts.factory.createArrowFunction(
                    undefined,
                    undefined,
                    eventSignature.parameters,
                    eventSignature.type,
                    ts.factory.createToken(
                      ts.SyntaxKind.EqualsGreaterThanToken,
                    ),
                    ts.factory.createBlock([], true),
                  ),
                ),
              ]);
              const printer = ts.createPrinter();
              const newCode = printer.printNode(
                ts.EmitHint.Unspecified,
                updatedHandlers,
                sourceFile,
              );

              const edit = new vscode.WorkspaceEdit();

              const startPosition = sourceFile.getLineAndCharacterOfPosition(
                existingFunctionHandlers.getStart(sourceFile),
              );
              const endPosition = sourceFile.getLineAndCharacterOfPosition(
                existingFunctionHandlers.getEnd(),
              );
              // Replace the entire document
              edit.replace(
                uri,
                new vscode.Range(
                  startPosition.line,
                  startPosition.character,
                  endPosition.line,
                  endPosition.character,
                ),
                newCode,
              );

              // Apply the edits
              await vscode.workspace.applyEdit(edit);
              vscode.window
                .showTextDocument(doc, vscode.ViewColumn.Beside)
                .then(() => {
                  vscode.commands.executeCommand(
                    "editor.action.formatDocument",
                  );
                  vscode.commands.executeCommand(
                    "workbench.action.quickOpen",
                    `@${createFunctionData.name}`,
                  );
                });
              return;
            }
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

  private async createEventHandlerFile(
    jsonStruct: RuiJSONFormat,
    document: vscode.TextDocument,
    vcl: ComponentLibraryMetaInformation,
  ): Promise<string> {
    const baseName = document.fileName.split("/").at(-1)?.split(".").at(0);
    const eventHandlerFile = `./${baseName}.events`;
    vscode.window.showInformationMessage(`created ${eventHandlerFile}`);
    const uri = getEventHandlerFileUri(document, eventHandlerFile);

    const encoder = new TextEncoder();
    const fileData = encoder.encode(
      `import type { Scope } from "./${baseName}.rui";\n\nexport default (scope: Scope) => ({});`,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.createFile(uri, { ignoreIfExists: true, contents: fileData });
    await vscode.workspace.applyEdit(edit);

    return eventHandlerFile;
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

  private async editDocument(
    document: vscode.TextDocument,
    Rui: string,
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();

    // Replace the entire document
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      Rui,
    );

    // Apply the edits
    await vscode.workspace.applyEdit(edit);
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
        return this.editDocument(document, tsxCode);
      });
    }

    return result;
  }
}
