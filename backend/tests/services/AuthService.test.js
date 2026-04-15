import { connectDB, closeDB, clearDB } from '../setup.js';
import { AuthService } from '../../src/services/AuthService.js';

beforeAll(async () => await connectDB());
afterEach(async () => {
  await clearDB();
  AuthService.__resetLoginAttemptsForTests();
});
afterAll(async () => await closeDB());

describe('AuthService', () => {
  describe('login() lockout', () => {
    it('sperrt den Login nach wiederholt falschem Passwort', async () => {
      await AuthService.register({
        username: 'lock_user',
        password: 'correct-password',
        firstName: 'Lock',
        lastName: 'User',
      });

      for (let index = 0; index < 5; index += 1) {
        await expect(
          AuthService.login({ username: 'lock_user', password: 'wrong-password' })
        ).rejects.toThrow('Falsches Passwort.');
      }

      await expect(
        AuthService.login({ username: 'lock_user', password: 'correct-password' })
      ).rejects.toThrow('Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuche es später erneut.');
    });

    it('setzt Fehlversuche nach erfolgreichem Login zurück', async () => {
      await AuthService.register({
        username: 'reset_user',
        password: 'correct-password',
        firstName: 'Reset',
        lastName: 'User',
      });

      await expect(
        AuthService.login({ username: 'reset_user', password: 'wrong-password' })
      ).rejects.toThrow('Falsches Passwort.');

      const successfulLogin = await AuthService.login({
        username: 'reset_user',
        password: 'correct-password',
      });

      expect(successfulLogin.token).toBeDefined();
      expect(successfulLogin.user.username).toBe('reset_user');

      await expect(
        AuthService.login({ username: 'reset_user', password: 'wrong-password' })
      ).rejects.toThrow('Falsches Passwort.');
    });
  });
});
