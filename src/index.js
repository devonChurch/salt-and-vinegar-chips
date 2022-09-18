const { ApolloServer, gql } = require("apollo-server");
const { ApolloServerPluginLandingPageLocalDefault } = require("apollo-server-core");
const fetch = require("node-fetch");

/**
 * To optimise the integration of our various static `.json` "configuration" files, we are leveraging
 * "Query-driven schema design". 
 * 
 * Focusing on the DX (Developer Experience) and using custom Resolvers, transformations and enrichments
 * to augment configuration payloads to conform to this schema structure.
 *
 * @see https://www.apollographql.com/docs/apollo-server/schema/schema#query-driven-schema-design
 */
const typeDefs = gql`
  type Metadata {
    id: String!
    source: String!
  }

  type Builds {
    name: String!
    metadata: Metadata
  }

  type Environment {
    href: String!
    builds: [Builds!]!
  }

  type Environments {
    live: Environment
    staging: Environment
    test: Environment
    local: Environment
  }

  type Mfe {
    key: String!
    type: String!
    name: String!
    dependencies: [Mfe!]!
    environments: Environments!
  }

  type Query {
    mfes: [Mfe]
    mfe(key: String): Mfe
  }
`;

const resolvers = {
  Query: {
    mfes: (parent, args, context, info) =>
      context.dataSources.globalConfigApi.getAllMfeItems(),

    mfe: (parent, args, context, info) =>
      context.dataSources.globalConfigApi.getMfeItemByKey(args.key),
  },

  Environment: {
    builds: (parent, args, context, info) =>
      context.dataSources.buildsConfigApi.getBuildsByMfeHref(parent.href),
  },

  Builds: {
    metadata: (parent, args, context, info) =>
      context.dataSources.metadataConfigApi.getMetadataByMfeHrefAndBuildName(parent.href, parent.name),
  },

  Mfe: {
    dependencies: (parent, args, context, info) =>
        context.dataSources.globalConfigApi.getMfeItemsByKeys(parent.dependencies)
  }
};

/** A simple facade to return parsed JSON data from an `href` target. */
const fetchAsJson = (href) => fetch(href).then((response) => response.json());

/**
 * The "Global Configuration" is a single source of truth that defines each Micro Front-end in our
 * ecosystem, their associated environments (Local, Test, Staging, Live) and dependencies on other
 * Micro Front-ends.
 */
const createGlobalConfigApi = () => {
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

  const getGlobalConfig = () => fetchAsJson(ENDPOINT);

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

/**
 * A "Builds Configuration" identifies every deployment for a specific Micro Front-end inside a
 * specific AWS environment (Test, Staging, Live).
 *
 * @example [MFE: Global Navigation] --> [Environment: Test]
 */
const createBuildsConfigApi = () => {
  /**
   * A Builds Configuration is located in the "root" of each Micro-Front-end subdomain.
   * @example https://mfe-app-shell.educationperfect.com/ep.builds.config.json
  */
  const createEndpoint = (mfeHref) => new URL("ep.builds.config.json", mfeHref);

  const getBuildsConfig = (mfeHref) => fetchAsJson(createEndpoint(mfeHref));

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

/**
 * The Metadata Configuration represents a single build deployed to a specific AWS environment (Test,
 * Staging, Live) for a specific Micro Front-end.
 *
 * @example [MFE: Global Navigation] --> [Environment: Test] --> [Build: Feature- Home Page Button]
 */
const createMetadataConfigApi = () => {
  /**
   * A "Metadata Configuration" is located at the "root" of a deployed build.
   * @example https://mfe-app-shell.educationperfect.com/release/ep.metadata.config.json
   */
  const createEndpoint = (mfeHref, buildName) =>
    new URL(`${buildName}/ep.metadata.config.json`, mfeHref);

  const getMetadataConfig = (mfeHref, buildName) => fetchAsJson(createEndpoint(mfeHref, buildName));

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

const dataSources = () => ({
  globalConfigApi: createGlobalConfigApi(),
  buildsConfigApi: createBuildsConfigApi(),
  metadataConfigApi: createMetadataConfigApi(),
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources,

  /**
   * This is an experiment, so let's let people have introspection capabilities in any context.
   * @see https://www.apollographql.com/docs/apollo-server/api/apollo-server/#introspection
   */
  introspection: true,

  csrfPrevention: true,
  plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
});

server.listen().then(({ url }) => console.log(`🚀  Server ready at ${url}`));
