import { fixtureClient } from './fixtures'
test('fixture today issue is Amor Fati with 6 connections', async () => {
  const r = await fixtureClient.getTodayIssue()
  expect(r.theme_label).toBe('Amor Fati')
  expect(r.content.title).toBe('Amor Fati')
  expect(r.content.connections).toHaveLength(6)
  expect(r.content.connections[0].flavor).toBe('discovery')
})
test('fixture archive has at least one item', async () => {
  const a = await fixtureClient.getArchive()
  expect(a.total).toBeGreaterThan(0)
})
