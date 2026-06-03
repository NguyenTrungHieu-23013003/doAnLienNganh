'use client';

import { cn } from '@/lib/utils';
import { TaskStatus } from '@/shared/types';
import { CheckCircle2, Clock, Ban, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const config: Record<TaskStatus, { label: string; className: string; Icon: React.FC<{ className?: string }> }> = {
  todo: { label: 'To Do', className: 'bg-zinc-800 text-zinc-400 border-zinc-700', Icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-blue-600/10 text-blue-400 border-blue-600/30', Icon: Clock },
  review: { label: 'Review', className: 'bg-amber-600/10 text-amber-400 border-amber-600/30', Icon: Eye },
  done: { label: 'Done', className: 'bg-green-600/10 text-green-400 border-green-600/30', Icon: CheckCircle2 },
  blocked: { label: 'Blocked', className: 'bg-red-600/10 text-red-400 border-red-600/30', Icon: Ban },
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const { label, className: statusClass, Icon } = config[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider',
      statusClass,
      className
    )}>
      <Icon className="w-3 h-3" />
      {t(label)}
    </span>
  );
}
