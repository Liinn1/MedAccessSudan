import { ProfileAvatar } from '../branding/ProfileAvatar'

interface DashboardProfileCardProps {
  name: string
  role: string
  imageUrl?: string | null
  editLabel: string
  onEdit: () => void
}

export function DashboardProfileCard({ name, role, imageUrl, editLabel, onEdit }: DashboardProfileCardProps) {
  return (
    <section className="dashboard-home-card items-center text-center">
      <ProfileAvatar className="size-24 rounded-full text-2xl shadow-sm" imageUrl={imageUrl} name={name} />
      <p className="mt-4 text-lg font-extrabold" dir="auto">{name}</p>
      <p className="text-sm text-[var(--color-text-secondary)]">{role}</p>
      <button className="mt-auto rounded-full border border-[var(--color-border)] px-5 py-2 text-sm font-bold hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]" onClick={onEdit} type="button">{editLabel}</button>
    </section>
  )
}
