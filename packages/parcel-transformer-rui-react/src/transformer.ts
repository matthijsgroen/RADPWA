import { Transformer } from "@parcel/plugin";
import { compiler } from "./compiler";

export default new Transformer({
  async loadConfig({ config }) {
    const { contents } = await config.getConfig<string>(["rapidui.config.js"], {
      parse: true,
    });

    return contents;
  },

  async transform({ asset, config }) {
    // Retrieve the asset's source code and source map.
    let source = await asset.getCode();
    let sourceMap = await asset.getMap();

    // Run it through some compiler, and set the results
    // on the asset.

    const interfaceConfig = JSON.parse(source);
    const result = await compiler(interfaceConfig, config);
    asset.setCode(result);
    asset.setMap(sourceMap);
    asset.type = "tsx";

    // Return the asset
    return [asset];
  },
});
