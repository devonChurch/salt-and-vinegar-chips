const { ApolloServer, gql } = require("apollo-server");
const {
  ApolloServerPluginLandingPageLocalDefault,
} = require("apollo-server-core");
const fetch = require("node-fetch");

const typeDefs = gql`
  type Environment {
    href: String!
  }

  type Environments {
    live: Environment
    staging: Environment
    test: Environment
    local: Environment
  }

  type Builds {
      metadata: [String]!
  }

  type Mfe {
    key: String! # Interit from Object key
    type: String!
    name: String!
    # builds: Builds! # Async call to ep.builds.config.json
    dependencies: [String]!
    environments: Environments!
  }

  type Query {
    mfes: [Mfe]
  }
`;

const resolvers = {
  Query: {
    mfes: (parent, args, context) => context.dataSources.globalConfigApi.getAllMfeItems()
  },

//   Builds: () => ({
//       metadata: ["banana"]
//   })
};

const globalConfigApi = (() => {
    const ENDPOINT = "https://mfe-global-config.educationperfect.com/v0/ep.global.config.json";
    const MFE_APP_TYPE = "MFE_APP";

    const getGlobalConfig = () => fetch(ENDPOINT).then((response) => response.json());
    const extractAndEnrichMfes = (globalConfigItems) => Object.entries(globalConfigItems)
        .filter(([key, values]) => values.type === MFE_APP_TYPE)
        .map(([key, values]) => ({ ...values, key, }));

    return {
        getAllMfeItems: () => getGlobalConfig().then(extractAndEnrichMfes)
    }

})();

const dataSources = () => ({
    globalConfigApi 
})

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