export function UserIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

export function MailIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24">
      <path d="m3 6 9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

export function PhoneIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24">
      <path d="M7.2 3.5 4.7 5.2c-.7.5-.9 1.4-.6 2.2 2.2 5.8 6.7 10.3 12.5 12.5.8.3 1.7.1 2.2-.6l1.7-2.5-4.2-3-1.8 1.8c-2.7-1.3-4.8-3.4-6.1-6.1l1.8-1.8-3-4.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24">
      <path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

export function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      {!visible && <path d="m4 4 16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />}
    </svg>
  )
}
