import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const GRAPHQL_API = 'https://mainnet.hedera.api.hgraph.io/v1/graphql';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: GRAPHQL_API,
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
