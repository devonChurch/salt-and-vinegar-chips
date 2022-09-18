const { ApolloServer, gql } = require("apollo-server");
const { ApolloServerPluginLandingPageLocalDefault } = require("apollo-server-core");
const apis = require("./apis");

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

const dataSources = () => ({
  globalConfigApi: apis.createGlobalConfigApi(),
  buildsConfigApi: apis.createBuildsConfigApi(),
  metadataConfigApi: apis.createMetadataConfigApi(),
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
