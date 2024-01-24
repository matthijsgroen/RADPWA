// Using ES6 import syntax
import highlightJS from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/atom-one-dark.css";
import React from "react";

// Then register the languages you need
highlightJS.registerLanguage("typescript", typescript);

const CodeHighlighter = ({ code }) => {
  const highlighted = highlightJS.highlight(code, { language: "typescript" });
  return (
    <code>
      <pre>
        <div
          style={{ background: "#333", color: "#999" }}
          dangerouslySetInnerHTML={{ __html: highlighted.value }}
        />
      </pre>
    </code>
  );
};

export { CodeHighlighter };
