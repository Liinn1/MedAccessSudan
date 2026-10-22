import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { PublicFaqSection } from './PublicFaqSection'

describe('public homepage FAQ', () => {
  afterEach(async () => { await i18n.changeLanguage('en') })

  it('exposes accordion state and expands a selected answer', () => {
    render(<PublicFaqSection />)
    const doctorQuestion = screen.getByRole('button', { name: /How do I book a doctor/i })

    expect(doctorQuestion).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(doctorQuestion)
    expect(doctorQuestion).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/open Find a Doctor/i)).toBeInTheDocument()
  })

  it('renders the shared accordion with Arabic translations', async () => {
    await i18n.changeLanguage('ar')
    render(<PublicFaqSection />)

    expect(screen.getByRole('heading', { name: 'لديك أسئلة عن ميد أكسس؟' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /كيف أحجز موعداً مع طبيب/ })).toBeInTheDocument()
  })
})
