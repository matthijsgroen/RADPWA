import { Transformer } from "@parcel/plugin";

export default new Transformer({
  async transform({ asset }) {
    // Retrieve the asset's source code and source map.
    // let source = await asset.getCode();
    let sourceMap = await asset.getMap();

    // Run it through some compiler, and set the results
    // on the asset.
    let code = `
        const item = () => {
            return (
                <p>Hello World</p>
            )
        };

        export default item;
    `;
    asset.setCode(code);
    asset.setMap(sourceMap);
    asset.type = "tsx";

    // Return the asset
    return [asset];
  },
});
