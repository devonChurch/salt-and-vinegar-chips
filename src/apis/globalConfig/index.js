const helpers = require("../../helpers");

/**
 * The "Global Configuration" is a single source of truth that defines each Micro Front-end in our
 * ecosystem, their associated environments (Local, Test, Staging, Live) and dependencies on other
 * Micro Front-ends.
 */
module.exports.createGlobalConfigApi = () => {
  /** Because this file is a "single source of truth", it's target is static. */
  const ENDPOINT = "https://mfe-global-config.educationperfect.com/v0/ep.global.config.json";

  /**
   * The Global Configuration has more than just Micro Front-end data:
   * + 3rd Party Vendor information
   * + Vanity URL proxy targets
   * + Back-end API endpoints
   * In that regard, we curate our Micro Front-end entries by a targeting  their `type` key.
   */
  const MFE_APP_TYPE = "MFE_APP";

  const getGlobalConfig = () => helpers.fetchAsJson(ENDPOINT);

  /**
   * The Global Configuration structure is a rigid `Object`. To optimise our DX around GraphQL
   * integration, we...
   *
   * + Extract only the Micro Front-end entries.
   * + Transform our response to an `Array` format.
   * + Enrich our `Array` entries with the original "root" `Object` "key".
   *
   * @example
   * Before:
   * {
   *   foo: { type: "MFE_APP", ... },
   *   bar: { type: "VENDOR", ... },
   *   baz: { type: "MFE_APP", ... },
   *   qux: { type: "ENDPOINTS", ... },
   * }
   * 
   * After:
   * [
   *   { key: "foo", type: "MFE_APP", ... },
   *   { key: "baz", type: "MFE_APP", ... },
   * ]
  */
  const extractTransformAndEnrichData = (globalConfigItems) =>
    Object.entries(globalConfigItems)
      .filter(([key, values]) => values.type === MFE_APP_TYPE)
      .map(([key, values]) => ({ ...values, key }));

  /**
   * Find a single Micro Front-end with a corresponding `key`.
   * 
   * @example
   * Entries:
   * [
   *   { key: "foo", type: "MFE_APP", ... },
   *   { key: "bar", type: "MFE_APP", ... },
   *   { key: "baz", type: "MFE_APP", ... },
   * ]
   * 
   * Result (Find key "bar"):
   * { key: "bar", type: "MFE_APP", ... }
   */
  const findMfeByKey = (key) => (mfeItems) =>
    mfeItems.find((item) => item.key === key);

  /**
   * Find a list of Micro Front-end's with corresponding `key` 's.
   * 
   * @example
   * Entries:
   * [
   *   { key: "foo", type: "MFE_APP", ... },
   *   { key: "bar", type: "MFE_APP", ... },
   *   { key: "baz", type: "MFE_APP", ... },
   * ]
   * 
   * Result (Find keys ["bar", "baz"]):
   * [
   *   { key: "bar", type: "MFE_APP", ... },
   *   { key: "baz", type: "MFE_APP", ... },
   * ]
   */
  const filterMfeByKeys = (keys) => (mfeItems) =>
    mfeItems.filter((item) => keys.includes(item.key));

  return {
    getAllMfeItems: () => getGlobalConfig().then(extractTransformAndEnrichData),
    getMfeItemByKey: (key) => getGlobalConfig().then(extractTransformAndEnrichData).then(findMfeByKey(key)),
    getMfeItemsByKeys: (keys) => getGlobalConfig().then(extractTransformAndEnrichData).then(filterMfeByKeys(keys)),
  };
};