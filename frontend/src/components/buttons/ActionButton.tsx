import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { actionButtonClassName, type ActionButtonSize, type ActionButtonVariant } from './actionButtonStyles'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ActionButtonVariant
  size?: ActionButtonSize
  as?: 'button' | 'span'
}

/** Shared MedAccess action control. Use `as="span"` only when the parent is already the interactive element. */
export function ActionButton({
  as = 'button',
  children,
  className = '',
  disabled,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...buttonProps
}: ActionButtonProps) {
  const classes = actionButtonClassName(variant, size, className)
  if (as === 'span') {
    return <span className={`${classes} pointer-events-none`}>{children}</span>
  }
  return (
    <button className={classes} disabled={disabled} type={type} {...buttonProps}>
      {children}
    </button>
  )
}
