import { AuthService } from '../services/AuthService.js';
import { User } from '../models/User.js';

export async function buildContext(req) {
  const authHeader = req?.headers?.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return { user: null };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { user: null };
  }

  try {
    const payload = AuthService.verifyToken(token);
    const user = await User.findById(payload.id).select('_id username firstName lastName createdAt');

    if (!user) {
      return { user: null };
    }

    return { user };
  } catch {
    return { user: null };
  }
}
