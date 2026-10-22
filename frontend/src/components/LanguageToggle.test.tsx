import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LanguageToggle } from './LanguageToggle'

describe('LanguageToggle', () => {
  afterEach(async () => { await i18n.changeLanguage('en') })

  it('switches document language and direction without reloading', async () => {
    const user = userEvent.setup()
    render(<LanguageToggle />)
    await user.click(screen.getByRole('button', { name: i18n.t('language.arabic') }))
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(localStorage.getItem('medaccess.language')).toBe('ar')
  })
})
