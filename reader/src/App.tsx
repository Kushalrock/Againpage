import { AppShell } from './components/shell/AppShell'
import { Today } from './pages/Today'

export default function App() {
  return (
    <AppShell active="today" onNavigate={() => {}}>
      <Today />
    </AppShell>
  )
}
