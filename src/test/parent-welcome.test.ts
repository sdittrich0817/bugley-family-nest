import { describe, expect, it } from 'vitest'
import { parentWelcomeEvent } from '@/lib/parent-welcome'

const completedAt = '2026-11-02T14:43:00Z'
const parent = { id: 'parent-one', email: 'parent@example.test', email_confirmed_at: completedAt,
  user_metadata: { first_name: 'Alex', adult_attested: true, parental_consent: true } }

describe('Parent welcome event', () => {
  it('requires verified email before welcoming a parent', () => {
    const { email_confirmed_at: _confirmation, ...unverified } = parent
    expect(parentWelcomeEvent(unverified, completedAt)).toBeNull()
    expect(parentWelcomeEvent(parent, completedAt)?.recipient).toBe('parent@example.test')
  })
  it('requires adult attestation and consent', () => {
    expect(parentWelcomeEvent({ ...parent, user_metadata: { adult_attested: false, parental_consent: true } }, completedAt)).toBeNull()
    expect(parentWelcomeEvent({ ...parent, user_metadata: { adult_attested: true, parental_consent: false } }, completedAt)).toBeNull()
  })
  it('requires completed family setup and sends only to the verified account address', () => {
    expect(parentWelcomeEvent(parent, '')).toBeNull()
    expect(parentWelcomeEvent(null, completedAt)).toBeNull()
    const { email: _email, ...withoutEmail } = parent
    expect(parentWelcomeEvent(withoutEmail, completedAt)).toBeNull()
    expect(parentWelcomeEvent(parent, completedAt)?.recipient).toBe(parent.email)
  })
  it('uses a stable setup event key for managed retry deduplication', () => {
    expect(parentWelcomeEvent(parent, completedAt)?.options.idempotencyKey).toBe('parent-welcome:parent-one:2026-11-02T14:43:00Z')
    expect(parentWelcomeEvent({ ...parent, id: 'parent-two' }, completedAt)?.options.idempotencyKey).not.toBe(parentWelcomeEvent(parent, completedAt)?.options.idempotencyKey)
  })
})