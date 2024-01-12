import { Transformer } from "@parcel/plugin";
import { compiler } from "./compiler";

export default new Transformer({
  async transform({ asset }) {
    // Retrieve the asset's source code and source map.
    let source = await asset.getCode();
    let sourceMap = await asset.getMap();

    // Run it through some compiler, and set the results
    // on the asset.

    const interfaceConfig = JSON.parse(source);
    asset.setCode(compiler(interfaceConfig));
    asset.setMap(sourceMap);
    asset.type = "tsx";

    // Return the asset
    return [asset];
  },
});
