const helpers = require("../../helpers");

/**
 * The Metadata Configuration represents a single build deployed to a specific AWS environment (Test,
 * Staging, Live) for a specific Micro Front-end.
 *
 * @example [MFE: Global Navigation] --> [Environment: Test] --> [Build: Feature- Home Page Button]
 */
module.exports.createMetadataConfigApi = () => {
  /**
   * A "Metadata Configuration" is located at the "root" of a deployed build.
   * @example https://mfe-app-shell.educationperfect.com/release/ep.metadata.config.json
   */
  const createEndpoint = (mfeHref, buildName) =>
    new URL(`${buildName}/ep.metadata.config.json`, mfeHref);

  const getMetadataConfig = (mfeHref, buildName) => helpers.fetchAsJson(createEndpoint(mfeHref, buildName));

  /**
   * The Metadata Configuration data structure is a simple `Object`. To optimise our DX around GraphQL
   * integration, we...
   *
   * + Transform the `Object` "keys" to be simple (the context that they are associated with a build
   *   is implied by the GraphQL Query).
   * 
   * @note We are in a transitionary phase of differentiating between "build" and "source" names 
   * (specifically with Trunk Based development and our "release" builds). In that regard, if no
   * `sourceName` is provided, we substitute `buildName` as a fallback.
   */
  const transformData = (metadata) => ({
    source: metadata.sourceName ?? metadata.buildName,
    id: metadata.buildId,
  })

  return {
    getMetadataByMfeHrefAndBuildName: (mfeHref, buildName) => getMetadataConfig(mfeHref, buildName).then(transformData),
  };
};