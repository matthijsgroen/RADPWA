import type { Scope } from "./NewScreen.rui";

export default (scope: Scope) => ({
  unlockButtonClick: (event: React.MouseEvent): void => {
    scope.updateButton.disabled = false;
    scope.inputText1.disabled = false;
  },
  updateButtonClick: (event: React.MouseEvent): void => {
    scope.text1.content = scope.inputText1.value;
    scope.inputText1.value = "";
  },
});
