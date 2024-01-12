export const compiler = (configFile) => {
  const mainId = configFile["id"];

  const code = `
        const ${mainId} = () => {
            return (
                <p>Hello World</p>
            )
        };

        export default ${mainId};
    `;

  return code;
};
