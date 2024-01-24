const fs = require("fs-extra");
const path = require("path");

const sourceDir = path.join(__dirname, "../dist");
const destDir = path.join(__dirname, "../../vscode-rui-editor/media");

const filesToCopy = ["index.1f77fd16.js", "index.d82e8cfa.css"];

filesToCopy.forEach((file) => {
  const sourceFile = path.join(sourceDir, file);
  const destFile = path.join(destDir, file);

  fs.copy(sourceFile, destFile, function (err) {
    if (err) {
      return console.error(`Error copying ${file}:`, err);
    }
    console.log(`Copied ${file} to extension media directory.`);
  });
});
