const helpers = require("../../helpers");

/**
 * A "Builds Configuration" identifies every deployment for a specific Micro Front-end inside a
 * specific AWS environment (Test, Staging, Live).
 *
 * @example [MFE: Global Navigation] --> [Environment: Test]
 */
module.exports.createBuildsConfigApi = () => {
  /**
   * A Builds Configuration is located in the "root" of each Micro-Front-end subdomain.
   * @example https://mfe-app-shell.educationperfect.com/ep.builds.config.json
  */
  const createEndpoint = (mfeHref) => new URL("ep.builds.config.json", mfeHref);

  const getBuildsConfig = (mfeHref) => helpers.fetchAsJson(createEndpoint(mfeHref));

  /**
   * The Builds Configuration data structure holds a simple list of builds. To optimise our DX around
   * GraphQL integration, we...
   *
   * + Transform our response into an `Object` format.
   * + Enrich our `Object` entries with then environment `href`.
   * 
   * @note the extra `href` transformation is not surfaced in our GraphQL schema. It facilitates
   * nested resolvers to get an enriched "parent" reference to make subsequent async calls (for things
   * like Metadata Configuration).
   *
   * @see https://github.com/graphql/graphql-js/issues/1098#issuecomment-346965548
  */
  const transformAndEnrichData = (mfeHref) => (buildItems) =>
    buildItems.map((item) => ({ name: item, href: mfeHref }));

  return {
    getBuildsByMfeHref: (mfeHref) => getBuildsConfig(mfeHref).then(transformAndEnrichData(mfeHref)),
  };
};