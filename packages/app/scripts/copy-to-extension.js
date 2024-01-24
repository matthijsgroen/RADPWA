const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "../dist/index.1f77fd16.js");
const destPath = path.join(
  __dirname,
  "../../vscode-rui-editor/media/index.1f77fd16.js",
);

fs.copyFile(sourcePath, destPath, (err) => {
  if (err) {
    console.error("Error copying file:", err);
    return;
  }
  console.log("File copied successfully.");
});
