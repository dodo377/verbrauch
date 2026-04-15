import { ApolloServer } from '@apollo/server';
import { connectDB, closeDB, clearDB } from '../setup.js';
import { typeDefs } from '../../src/schema/typeDefs.js';
import { resolvers } from '../../src/resolvers/index.js';
import { buildContext } from '../../src/context/buildContext.js';
import { AuthService } from '../../src/services/AuthService.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('GraphQL Auth Context', () => {
  describe('buildContext()', () => {
    it('setzt user auf null, wenn kein Authorization-Header vorhanden ist', async () => {
      const context = await buildContext({ headers: {} });
      expect(context.user).toBeNull();
    });

    it('setzt user auf null, wenn das Token ungültig ist', async () => {
      const context = await buildContext({
        headers: { authorization: 'Bearer invalid.token.value' },
      });

      expect(context.user).toBeNull();
    });

    it('liefert den User im Context bei gültigem Bearer-Token', async () => {
      const { token, user } = await AuthService.register({
        username: 'auth_context_user',
        password: 'supersecret123',
        firstName: 'Auth',
        lastName: 'User',
      });

      const context = await buildContext({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(context.user).not.toBeNull();
      expect(context.user.id.toString()).toBe(user.id.toString());
      expect(context.user.username).toBe('auth_context_user');
    });
  });

  describe('geschützte GraphQL Resolver', () => {
    const query = `
      query GetReadings($type: ReadingType!) {
        getReadings(type: $type) {
          id
        }
      }
    `;

    let server;

    beforeAll(async () => {
      server = new ApolloServer({ typeDefs, resolvers });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('gibt einen Auth-Fehler zurück, wenn kein User im Context ist', async () => {
      const response = await server.executeOperation(
        {
          query,
          variables: { type: 'household' },
        },
        {
          contextValue: { user: null },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors[0].message).toBe('Nicht autorisiert');
      }
    });

    it('lässt Query zu, wenn User per JWT im Context aufgelöst wurde', async () => {
      const { token } = await AuthService.register({
        username: 'auth_graphql_user',
        password: 'supersecret123',
        firstName: 'Graph',
        lastName: 'QL',
      });

      const context = await buildContext({
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await server.executeOperation(
        {
          query,
          variables: { type: 'household' },
        },
        {
          contextValue: context,
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data.getReadings).toEqual([]);
      }
    });
  });
});
