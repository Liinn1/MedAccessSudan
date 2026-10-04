import { verificationBadgeClass } from '../../services/providerVerificationService'

export function AdminStatusBadge({ status, label }: { status: string; label: string }) {
  const tone = status === 'verified' || status === 'approved' || status === 'resolved' || status === 'active'
    ? 'verified'
    : status === 'under_review' || status === 'in_progress' || status === 'mapped'
      ? 'under_review'
      : status === 'action_required' || status === 'new' || status === 'pending' || status === 'pending_documents'
        ? 'action_required'
        : status === 'rejected' || status === 'inactive' || status === 'suspended'
          ? 'suspended'
          : status
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(tone)}`}>{label}</span>
}
