import { getStatusColor } from '@bossboard/shared';

interface BadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: BadgeProps) {
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ color, backgroundColor: `${color}15` }}
    >
      {label || status}
    </span>
  );
}
