import { createClient, fetchExchange } from 'urql';

export const client = createClient({
  url: '/graphql',  // Vite proxied -> kein hardcoded IP noetig
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
