import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminSettingsPage from './AdminSettingsPage'

const saveSettings = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../hooks/useAppSettings', () => ({ useAppSettings: () => ({
  config: { weekdays:[1,2,3,4,5,6,7], cutoffTime:'20:00', cancelTime:'06:00' }, loading:false, saveSettings,
})}))

describe('AdminSettingsPage', () => {
  it('alterna un día y guarda', async () => {
    render(<MemoryRouter><AdminSettingsPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'D' })) // quita domingo (7)
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(saveSettings).toHaveBeenCalled())
    expect(saveSettings.mock.calls[0][0].weekdays).not.toContain(7)
  })
})
