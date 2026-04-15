export function requireAuth(context, message = 'Nicht autorisiert') {
  if (!context?.user) {
    throw new Error(message);
  }

  return context.user;
}
