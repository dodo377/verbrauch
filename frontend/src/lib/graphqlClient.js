import { createClient, fetchExchange } from 'urql';

export const client = createClient({
  url: 'http://localhost:4000/graphql',
  exchanges: [fetchExchange],
  preferGetMethod: false,
  fetchOptions: () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        authorization: token ? `Bearer ${token}` : '',
        'apollo-require-preflight': 'true',
      },
    };
  },
});
