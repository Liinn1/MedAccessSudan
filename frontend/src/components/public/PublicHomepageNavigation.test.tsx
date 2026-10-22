import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { submitPublicContact } from '../../services/adminService'
import { ContactSection } from './ContactSection'
import { PublicFooter } from './PublicFooter'

vi.mock('../../services/adminService', () => ({ submitPublicContact: vi.fn() }))

describe('public homepage contact and footer navigation', () => {
  afterEach(async () => { vi.mocked(submitPublicContact).mockReset(); await i18n.changeLanguage('en') })

  it('keeps contact columns in physical LTR order while making Arabic form content RTL', async () => {
    await i18n.changeLanguage('ar')
    const { container } = render(<ContactSection />)

    expect(container.querySelector('#contact > div')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('heading', { level: 2 }).closest('[dir]')).toHaveAttribute('dir', 'rtl')
    expect(screen.queryByText('طرق أخرى للتواصل')).not.toBeInTheDocument()
  })

  it('submits the retained contact form and shows its localized success message without the removed block', async () => {
    const user = userEvent.setup()
    vi.mocked(submitPublicContact).mockResolvedValueOnce(42)
    render(<ContactSection />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Sara Patient')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'sara@example.test')
    await user.type(screen.getByRole('textbox', { name: 'Subject' }), 'Appointment support')
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Please help me review my appointment details.')
    await user.click(screen.getByRole('button', { name: 'Send Message' }))

    expect(submitPublicContact).toHaveBeenCalledOnce()
    expect(await screen.findByText('Your message was sent to MedAccess.')).toBeInTheDocument()
    expect(screen.queryByText('Other ways to reach us')).not.toBeInTheDocument()
  })

  it('maps footer homepage links to the established section anchors', () => {
    render(<MemoryRouter><PublicFooter /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/#home')
    expect(screen.getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/#about')
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/#services')
    expect(screen.getByRole('link', { name: 'Find a Doctor' })).toHaveAttribute('href', '/#featured-doctors')
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/#faq')
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/#contact')
  })

  it('maps every registration help link to its established route in the required order', () => {
    render(<MemoryRouter><PublicFooter /></MemoryRouter>)

    const links = ['Log In', 'Patient Registration', 'Doctor Registration', 'Laboratory Registration']
      .map((name) => screen.getByRole('link', { name }))

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/login',
      '/register/patient',
      '/register/doctor',
      '/register/laboratory',
    ])
  })

  it('maps all service links to the existing authenticated patient destinations', () => {
    render(<MemoryRouter><PublicFooter /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Clinic Visits' })).toHaveAttribute('href', '/login?redirect=%2Fpatient%2Fdoctors%2Fsearch')
    expect(screen.getByRole('link', { name: 'Home Visits' })).toHaveAttribute('href', '/login?redirect=%2Fpatient%2Fhome-visits')
    expect(screen.getByRole('link', { name: 'Laboratory Tests' })).toHaveAttribute('href', '/login?redirect=%2Fpatient%2Flaboratory')
    expect(screen.getByRole('link', { name: 'Laboratory Registration' })).toHaveAttribute('href', '/register/laboratory')
  })

  it('renders the laboratory registration footer link in Arabic without changing its route', async () => {
    await i18n.changeLanguage('ar')
    render(<MemoryRouter><PublicFooter /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'تسجيل المختبر' })).toHaveAttribute('href', '/register/laboratory')
    expect(screen.getByRole('link', { name: 'الفحوصات المخبرية' })).toHaveAttribute('href', '/login?redirect=%2Fpatient%2Flaboratory')
  })
})
