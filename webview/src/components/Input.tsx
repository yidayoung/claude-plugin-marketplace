import { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            // VS Code 输入框样式
            'px-2 py-1.5 rounded border',
            'bg-input-bg text-input-fg text-sm',
            'placeholder:text-input-placeholder',
            'border-input-border',
            'focus:outline-none focus:border-focus-border focus:outline-1 focus:outline-focus-border',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            // 错误状态
            error && 'border-error-fg focus:border-error-fg focus:outline-error-fg',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-error-fg">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
