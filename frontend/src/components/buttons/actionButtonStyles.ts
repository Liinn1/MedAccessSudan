export type ActionButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export type ActionButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ActionButtonVariant, string> = {
  primary: 'border border-transparent bg-[var(--color-primary)] text-white hover:bg-[#0F766E] active:bg-[#0D5F59]',
  secondary: 'border border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-surface)] active:bg-teal-100',
  tertiary: 'border border-teal-200 bg-white text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-surface)] active:bg-teal-100',
  danger: 'border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 active:bg-red-100',
}

const sizes: Record<ActionButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-sm', md: 'min-h-11 px-5 text-sm', lg: 'min-h-12 px-6 text-base',
}

const baseClass = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-bold transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50'

export function actionButtonClassName(variant: ActionButtonVariant = 'secondary', size: ActionButtonSize = 'md', className = '') {
  return `${baseClass} ${variants[variant]} ${sizes[size]} ${className}`.trim()
}
