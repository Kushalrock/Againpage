import type { ConnectionTest } from './index'
import type { ProviderTestRequest, ProviderTestResult } from '../types/settings'
export function httpConnectionTest(baseUrl = 'http://localhost:8000'): ConnectionTest {
  return {
    async run(req: ProviderTestRequest): Promise<ProviderTestResult> {
      const res = await fetch(baseUrl + '/provider/test', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) })
      return res.json()
    },
  }
}
