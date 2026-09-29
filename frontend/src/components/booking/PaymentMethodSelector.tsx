import { useTranslation } from 'react-i18next'
import { formatCardNumber, formatExpiry, type CardPaymentFields } from '../../utils/cardPaymentValidation'
import type { BookingPaymentMethod } from '../../hooks/useBookingPayment'

interface PaymentMethodSelectorProps {
  method: BookingPaymentMethod | ''
  onMethodChange: (method: BookingPaymentMethod) => void
  card: CardPaymentFields
  onCardChange: (card: CardPaymentFields) => void
  errors: { method?: string; name?: string; number?: string; expiry?: string; cvv?: string }
}

export function PaymentMethodSelector({ method, onMethodChange, card, onCardChange, errors }: PaymentMethodSelectorProps) {
  const { t } = useTranslation()
  const options: BookingPaymentMethod[] = ['card', 'pay_later']

  return (
    <fieldset className="mt-6">
      <legend className="text-lg font-extrabold">{t('patient.payment.title')}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = method === option
          return (
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)]' : 'border-[var(--color-border)] bg-white'}`} key={option}>
              <input checked={selected} className="mt-1 size-4 accent-[var(--color-primary)]" name="booking-payment-method" onChange={() => onMethodChange(option)} type="radio" value={option} />
              <span>
                <span className="block font-extrabold">{t(`patient.payment.methods.${option}`)}</span>
                <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{t(`patient.payment.help.${option}`)}</span>
              </span>
            </label>
          )
        })}
      </div>
      {errors.method && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{errors.method}</p>}
      {method === 'card' && <div className="mt-4 grid gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">{t('patient.payment.cardDevelopmentNote')}</p>
        <CardField error={errors.name} id="cardholder-name" label={t('patient.payment.fields.name')} onChange={(value) => onCardChange({ ...card, name: value })} value={card.name} />
        <CardField autoComplete="cc-number" dir="ltr" error={errors.number} id="card-number" inputMode="numeric" label={t('patient.payment.fields.number')} onChange={(value) => onCardChange({ ...card, number: formatCardNumber(value) })} placeholder="•••• •••• •••• ••••" value={card.number} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CardField autoComplete="cc-exp" dir="ltr" error={errors.expiry} id="card-expiry" inputMode="numeric" label={t('patient.payment.fields.expiry')} onChange={(value) => onCardChange({ ...card, expiry: formatExpiry(value) })} placeholder="MM / YY" value={card.expiry} />
          <CardField autoComplete="cc-csc" dir="ltr" error={errors.cvv} id="card-cvv" inputMode="numeric" label={t('patient.payment.fields.cvv')} onChange={(value) => onCardChange({ ...card, cvv: value.replace(/\D/g, '').slice(0, 4) })} value={card.cvv} />
        </div>
      </div>}
    </fieldset>
  )
}

function CardField({ autoComplete, dir, error, id, inputMode, label, onChange, placeholder, value }: {
  autoComplete?: string
  dir?: 'ltr'
  error?: string
  id: string
  inputMode?: 'numeric'
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  const errorId = `${id}-error`
  return (
    <div>
      <label className="block font-bold" htmlFor={id}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={`mt-2 block min-h-12 w-full rounded-xl border px-4 font-semibold ${error ? 'border-red-400' : 'border-[var(--color-border)]'}`}
        dir={dir}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error && <p className="mt-1 text-sm font-semibold text-red-700" id={errorId} role="alert">{error}</p>}
    </div>
  )
}
