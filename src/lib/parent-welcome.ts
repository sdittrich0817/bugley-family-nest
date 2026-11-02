import { isActiveParent } from './parent-auth'

// Account and setup event come from authenticated server reads, never form input.
export function parentWelcomeEvent(user: {
  id: string; email?: string; email_confirmed_at?: string;
  user_metadata: Record<string, unknown>;
} | null, completedAt: string) {
  if (!user?.email || !isActiveParent(user) || !completedAt) return null
  const name = user.user_metadata['first_name']
  return {
    recipient: user.email,
    options: {
      templateData: { name: typeof name === 'string' ? name.slice(0, 80) : undefined },
      idempotencyKey: `parent-welcome:${user.id}:${completedAt}`,
    },
  }
}