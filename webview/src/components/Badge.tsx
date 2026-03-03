import { cn } from '../lib/cn';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  // VS Code 样式的 Badge
  const variantStyles = {
    // Default badge - 使用 VS Code 的 badge 颜色
    default: 'bg-badge-bg text-badge-fg',

    // Success badge - 使用终端绿色
    success: 'bg-success-fg/10 text-success-fg',

    // Warning badge - 使用 VS Code 的警告颜色
    warning: 'bg-warning-fg/10 text-warning-fg',

    // Error badge - 使用 VS Code 的错误颜色
    error: 'bg-error-fg/10 text-error-fg'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
