import { render, screen, fireEvent } from '@testing-library/react'
import { VersionMismatch } from './VersionMismatch'

test('engine-too-old shows the upgrade command, versions, and Retry', () => {
  let retried = 0
  render(<VersionMismatch kind="engine-too-old" engineVersion="0.1.3" readerVersion="0.1.4"
    minEngine="0.1.4" minReader="0.1.0" onRetry={() => { retried += 1 }} />)
  expect(screen.getByText(/fallen behind/i)).toBeInTheDocument()
  expect(screen.getByText('git pull && docker compose up --build -d')).toBeInTheDocument()
  expect(screen.getByText(/0\.1\.3/)).toBeInTheDocument()          // shows current engine version
  fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }))
  expect(retried).toBe(1)
})

test('engine-too-old with unknown engine version still renders (no command hidden)', () => {
  render(<VersionMismatch kind="engine-too-old" engineVersion={null} readerVersion="0.1.4"
    minEngine="0.1.4" minReader="0.1.0" onRetry={() => {}} />)
  expect(screen.getByText('git pull && docker compose up --build -d')).toBeInTheDocument()
})

test('reader-too-old shows update-your-reader copy and NO shell command', () => {
  render(<VersionMismatch kind="reader-too-old" engineVersion="0.2.0" readerVersion="0.1.0"
    minEngine="0.1.4" minReader="0.2.0" onRetry={() => {}} />)
  expect(screen.getByText(/update your reader/i)).toBeInTheDocument()
  expect(screen.queryByText(/docker compose/)).not.toBeInTheDocument()
})
