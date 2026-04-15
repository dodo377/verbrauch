import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// In Produktion kommt das zwingend in eine .env Datei!
const JWT_SECRET = process.env.JWT_SECRET || 'geheimes_entwickler_token_42';
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

const loginAttempts = new Map();

const getLoginKey = (username) => String(username || '').trim().toLowerCase();

const isLoginLocked = (loginKey) => {
  const attemptState = loginAttempts.get(loginKey);
  if (!attemptState) return false;

  if (attemptState.lockUntil > Date.now()) {
    return true;
  }

  if (attemptState.lockUntil) {
    loginAttempts.delete(loginKey);
  }

  return false;
};

const registerFailedAttempt = (loginKey) => {
  const previous = loginAttempts.get(loginKey) || { count: 0, lockUntil: 0 };
  const nextCount = previous.count + 1;

  if (nextCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    loginAttempts.set(loginKey, {
      count: 0,
      lockUntil: Date.now() + (LOGIN_LOCK_MINUTES * 60 * 1000),
    });
    return;
  }

  loginAttempts.set(loginKey, {
    count: nextCount,
    lockUntil: 0,
  });
};

export class AuthService {
  static __resetLoginAttemptsForTests() {
    loginAttempts.clear();
  }

  static verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Registriert einen neuen Benutzer.
   */
  static async register({ username, password, firstName, lastName }) {
    // 1. Prüfen, ob der User schon existiert
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error('Dieser Benutzername ist bereits vergeben.');
    }

    // 2. Passwort sicher hashen
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. User in der DB speichern
    const user = new User({
      username,
      passwordHash,
      firstName,
      lastName
    });
    await user.save();

    // 4. Token generieren (Gültig für 7 Tage)
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return { token, user };
  }

  /**
   * Loggt einen bestehenden Benutzer ein.
   */
  static async login({ username, password }) {
    const loginKey = getLoginKey(username);

    if (isLoginLocked(loginKey)) {
      throw new Error('Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuche es später erneut.');
    }

    // 1. User suchen
    const user = await User.findOne({ username });
    if (!user) {
      registerFailedAttempt(loginKey);
      throw new Error('Benutzer nicht gefunden.');
    }

    // 2. Passwort abgleichen
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      registerFailedAttempt(loginKey);
      throw new Error('Falsches Passwort.');
    }

    loginAttempts.delete(loginKey);

    // 3. Token generieren
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return { token, user };
  }
}