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

  type Mfe {
    key: String! # Interit from Object key
    type: String!
    name: String!
    builds: [String]! # Async call to ep.builds.config.json
    dependencies: [String]!
    environments: Environments!
  }

  type Query {
    mfes: [Mfe]
  }
`;

const resolvers = {
  Query: {
    mfes: () => fetch(
      "https://mfe-global-config.educationperfect.com/v0/ep.global.config.json"
    )
      .then((response) => response.json())
      .then(items => 
        Object.entries(items).filter(([key, values]) => values.type === "MFE_APP")
        .map(([key, values]) => ({
            ...values,
            key,
            builds: [], // Need to sort this out with an async request
        }))    
    ),
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,

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
