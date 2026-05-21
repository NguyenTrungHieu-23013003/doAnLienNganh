import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</label>}
      <input
        id={id}
        ref={ref}
        className={cn(
          'w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 text-sm',
          'focus:outline-none focus:border-blue-500 transition-colors',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, options, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</label>}
      <select
        id={id}
        ref={ref}
        className={cn(
          'w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm',
          'focus:outline-none focus:border-blue-500 transition-colors appearance-none',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</label>}
      <textarea
        id={id}
        ref={ref}
        rows={4}
        className={cn(
          'w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 text-sm',
          'focus:outline-none focus:border-blue-500 transition-colors resize-none',
          className
        )}
        {...props}
      />
    </div>
  )
);
Textarea.displayName = 'Textarea';
