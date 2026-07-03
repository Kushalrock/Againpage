import { fixtureClient } from './fixtures'

test('fixture status + triggers', async () => {
  const s = await fixtureClient.getStatus()
  expect(typeof s.indexed).toBe('boolean')
  expect('next_edition_at' in s).toBe(true)
  expect((await fixtureClient.reindex()).job_id).toBeTruthy()
  expect((await fixtureClient.triggerIssue()).job_id).toBeTruthy()
})
