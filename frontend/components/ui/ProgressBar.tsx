import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  total: number;
  className?: string;
  showText?: boolean;
}

export function ProgressBar({ value, total, className, showText = true }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-border/40">
        <div
          className="bg-gradient-to-r from-primary-500 to-accent-cyan h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 font-mono">
          <span>{value} / {total} sent</span>
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
}
