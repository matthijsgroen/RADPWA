type Scope = {
  user: { value: string };
};

export default (scope: Scope) => ({
  testButtonClick: (e: React.MouseEvent) => {
    scope.user.value = "Hello there!";
  },
});
