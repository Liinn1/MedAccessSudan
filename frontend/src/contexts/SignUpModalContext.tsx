import { useState, type ReactNode } from 'react'
import { SignUpChoiceModal } from '../components/public/SignUpChoiceModal'
import { SignUpModalContext } from './signUpModal'

export function SignUpModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <SignUpModalContext.Provider value={() => setOpen(true)}>
      {children}
      <SignUpChoiceModal onClose={() => setOpen(false)} open={open} />
    </SignUpModalContext.Provider>
  )
}
