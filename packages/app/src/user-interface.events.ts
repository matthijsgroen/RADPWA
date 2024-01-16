type Scope = {
  readonly user: { value: string };
};

export default (scope: Scope) => ({
  testButtonClick: (e: React.MouseEvent) => {
    scope.user.value = "Hello there!";
    console.log("Wooohooo");
  },
});
