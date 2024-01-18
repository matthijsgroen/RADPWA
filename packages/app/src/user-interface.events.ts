type Scope = {
  readonly user: { value: string };
};

export default (scope: Scope) => ({
  testButtonClick: (e: React.MouseEvent) => {
    console.log("Wooohooo", scope.user.value);
    scope.user.value = "World";

    const haha = (scope: { another: { item: { here: string } } }) => {
      return scope.another.item.here;
    };
  },
});
