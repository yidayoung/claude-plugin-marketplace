import { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'px-3 py-2 rounded-md border border-border',
            'bg-card text-foreground text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
