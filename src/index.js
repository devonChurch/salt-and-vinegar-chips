const { ApolloServer, gql } = require("apollo-server");
const {
  ApolloServerPluginLandingPageLocalDefault,
} = require("apollo-server-core");
const fetch = require("node-fetch");

const typeDefs = gql`
  type Metadata {
    id: String!
    source: String!
  }

  type Builds {
    name: String!
    href: String!
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
    key: String! # Interit from Object key
    type: String!
    name: String!
    dependencies: [String]!
    environments: Environments!
  }

  type Query {
    mfes: [Mfe]
    mfe(key: String): Mfe
  }
`;

const resolvers = {
  Query: {
    mfes: (parent, args, context) =>
      context.dataSources.globalConfigApi.getAllMfeItems(),
    mfe: (parent, args, context) =>
      context.dataSources.globalConfigApi.getMfeItemByKey(args.key),
  },

  Environment: {
    builds: (parent, args, context, info) =>
      context.dataSources.buildsConfigApi.getBuildsByMfeHref(parent.href),
  },

  Builds: {
    metadata: (parent, args, context, info) =>
      console.log(parent, args, context, info) ||
      context.dataSources.metadataConfigApi.getMetadataByMfeHrefAndBuildName(
        parent.href, parent.name
      ),
  },
};

const createGlobalConfigApi = () => {
  const ENDPOINT =
    "https://mfe-global-config.educationperfect.com/v0/ep.global.config.json";
  const MFE_APP_TYPE = "MFE_APP";

  const getGlobalConfig = () =>
    fetch(ENDPOINT).then((response) => response.json());

  const extractTransformAndEnrichData = (globalConfigItems) =>
    Object.entries(globalConfigItems)
      .filter(([key, values]) => values.type === MFE_APP_TYPE)
      .map(([key, values]) => ({ ...values, key }));

  const extractMfeByKey = (key) => (mfeItems) =>
    mfeItems.find((item) => item.key === key);

  return {
    getAllMfeItems: () => getGlobalConfig().then(extractTransformAndEnrichData),
    getMfeItemByKey: (key) =>
      getGlobalConfig()
        .then(extractTransformAndEnrichData)
        .then(extractMfeByKey(key)),
  };
};

const createBuildsConfigApi = () => {
  const createEndpoint = (mfeHref) => new URL("ep.builds.config.json", mfeHref);

  const getBuildsConfig = (mfeHref) =>
    fetch(createEndpoint(mfeHref)).then((response) => response.json());

  const transformData = (mfeHref) => (buildItems) =>
    buildItems.map((item) => ({ name: item, href: mfeHref }));

  return {
    getBuildsByMfeHref: (mfeHref) =>
      getBuildsConfig(mfeHref).then(transformData(mfeHref)),
  };
};

const createMetadataConfigApi = () => {
  const createEndpoint = (mfeHref, buildName) =>
    new URL(`${buildName}/ep.metadata.config.json`, mfeHref);

  const getMetadataConfig = (mfeHref, buildName) =>
    fetch(createEndpoint(mfeHref, buildName)).then((response) =>
      response.json()
    );

  const transformData = (metadata) => ({
    source: metadata.buildName,
    id: metadata.buildId,
  })

  return {
    getMetadataByMfeHrefAndBuildName: (mfeHref, buildName) =>
      getMetadataConfig(mfeHref, buildName).then(transformData),
  };
};

const dataSources = () => ({
  globalConfigApi: createGlobalConfigApi(),
  buildsConfigApi: createBuildsConfigApi(),
  metadataConfigApi: createMetadataConfigApi(),
});

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources,

  // This is an experiment, so let's let people have introspection capabilities in any context.
  // @see https://www.apollographql.com/docs/apollo-server/api/apollo-server/#introspection
  introspection: true,

  // csrfPrevention: true,
  // cache: 'bounded',
  // /**
  //  * What's up with this embed: true option?
  //  * These are our recommended settings for using AS;
  //  * they aren't the defaults in AS3 for backwards-compatibility reasons but
  //  * will be the defaults in AS4. For production environments, use
  //  * ApolloServerPluginLandingPageProductionDefault instead.
  // **/
  plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
