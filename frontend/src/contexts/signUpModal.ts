import { createContext, useContext } from 'react'

export const SignUpModalContext = createContext<(() => void) | null>(null)

export function useSignUpModal(): () => void {
  const openSignUpModal = useContext(SignUpModalContext)
  if (!openSignUpModal) throw new Error('useSignUpModal must be used within SignUpModalProvider.')
  return openSignUpModal
}
