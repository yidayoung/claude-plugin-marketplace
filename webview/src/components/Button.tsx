import { forwardRef } from 'react';
import { cn } from '../lib/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', children, loading = false, disabled, ...props }, ref) => {
    // VS Code 使用更小的圆角和更快的过渡
    const baseStyles = 'inline-flex items-center justify-center rounded font-medium transition-colors duration-150 focus:outline-none focus:outline-1 focus:outline-offset-1 focus:outline-focus-border disabled:opacity-50 disabled:cursor-not-allowed';

    // VS Code 原生按钮样式
    const variantStyles = {
      // Primary button - 使用 VS Code 的主要按钮样式
      primary: 'bg-btn-bg text-btn-fg hover:bg-btn-hover',

      // Secondary button - 使用 VS Code 的次要按钮样式
      secondary: 'bg-btn-secondary-bg text-btn-secondary-fg hover:bg-btn-secondary-hover border border-transparent',

      // Destructive button - 用于删除/卸载等危险操作
      destructive: 'bg-transparent border border-error-fg text-error-fg hover:bg-error-fg hover:text-background',

      // Ghost button - 用于工具栏图标按钮
      ghost: 'bg-transparent text-foreground hover:bg-hover-bg border border-transparent',

      // Icon button - 专门用于图标按钮（工具栏）
      icon: 'bg-transparent text-text-secondary hover:bg-hover-bg hover:text-foreground p-1.5',
    };

    const sizeStyles = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
