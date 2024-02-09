const fs = require("fs-extra");
const path = require("path");

const sourceDir = path.join(__dirname, "../dist");
const destDir = path.join(__dirname, "../../vscode-rui-editor/media");

const filesToCopy = [
  "index.048cd1c8.js",
  "index.59a8f4de.css",
  "Inter-italic.var.6a2c71c9.woff2",
  "Inter-roman.var.40521a19.woff2",
];

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
