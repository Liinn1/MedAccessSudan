import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomeIcon } from '../icons/PatientHomeIcons'
import { DashboardNavigationShell } from './DashboardNavigationShell'

describe('DashboardNavigationShell support navigation', () => {
  it('routes the shared dashboard support action to the canonical public contact section', () => {
    render(<MemoryRouter><DashboardNavigationShell
      closeLabel="Close"
      contactSupportLabel="Contact Support"
      helpDescription="Support description"
      helpTitle="Need help?"
      isLoggingOut={false}
      items={[{ key: 'dashboard', label: 'Dashboard', icon: HomeIcon, active: true, onSelect: vi.fn() }]}
      loggingOutLabel="Logging out"
      logoutLabel="Log out"
      menuLabel="Menu"
      mobileLabel="Mobile navigation"
      navigationLabel="Dashboard navigation"
      onLogout={vi.fn()}
      roleLabel="Patient"
    /></MemoryRouter>)

    for (const link of screen.getAllByRole('link', { name: 'Contact Support' })) {
      expect(link).toHaveAttribute('href', '/#contact')
    }
  })
})
