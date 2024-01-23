import ts, { SyntaxKind, addSyntheticLeadingComment } from "typescript";

export const transferComments = <T extends ts.Node>(
  sourceNode: T,
  destinationNode: T,
  sourceFile: ts.SourceFile,
  hasTransferred: { comments: ts.CommentRange[] },
): T => {
  return destinationNode;

  //   const comments =
  //     ts.getLeadingCommentRanges(
  //       sourceFile.getFullText(),
  //       sourceNode.getFullStart(),
  //     ) ?? [];

  //   let updatedNode = destinationNode;
  //   if (comments.length > 0) {
  //     comments.forEach((commentRange) => {
  //       if (
  //         hasTransferred.comments.find(
  //           (range) =>
  //             range.pos === commentRange.pos && range.end === commentRange.end,
  //         )
  //       ) {
  //         return;
  //       }
  //       const rawText = sourceFile
  //         .getFullText()
  //         .slice(commentRange.pos, commentRange.end);
  //       const text =
  //         commentRange.kind === SyntaxKind.MultiLineCommentTrivia
  //           ? rawText.slice(2, -2) // strip /* and */
  //           : rawText.slice(2); // strip //

  //       updatedNode = addSyntheticLeadingComment(
  //         updatedNode,
  //         commentRange.kind,
  //         text,
  //         commentRange.hasTrailingNewLine,
  //       );
  //       hasTransferred.comments.push(commentRange);
  //     });
  //   }
  //   return updatedNode;
};
