import React, { InputHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export function FormInput({
  label,
  error,
  success,
  helperText,
  fullWidth = true,
  className = '',
  id,
  ...props
}: FormInputProps) {
  const inputId = id || `input_${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-2"
          style={{ color: 'oklch(0.70 0.010 285)' }}
        >
          {label}
          {props.required && <span style={{ color: 'oklch(0.75 0.15 25)' }}>*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}_error` : helperText ? `${inputId}_helper` : undefined}
          className={`w-full px-4 py-2 md:py-2 py-3 rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 md:h-auto h-11 ${className}`}
          style={{
            background: 'oklch(0.18 0.005 285)',
            borderColor: error ? 'oklch(0.75 0.15 25)' : success ? 'oklch(0.72 0.17 145)' : 'oklch(0.28 0.005 285)',
            color: 'oklch(0.90 0.005 65)',
            '--tw-ring-color': error ? 'oklch(0.75 0.15 25 / 0.5)' : success ? 'oklch(0.72 0.17 145 / 0.5)' : 'oklch(0.48 0.22 25 / 0.5)',
          } as React.CSSProperties}
          {...props}
        />
        {error && (
          <AlertCircle
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'oklch(0.75 0.15 25)' }}
          />
        )}
        {success && !error && (
          <CheckCircle
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'oklch(0.72 0.17 145)' }}
          />
        )}
      </div>
      {error && (
        <p
          id={`${inputId}_error`}
          className="text-xs mt-1"
          style={{ color: 'oklch(0.75 0.15 25)' }}
          role="alert"
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          id={`${inputId}_helper`}
          className="text-xs mt-1"
          style={{ color: 'oklch(0.50 0.010 285)' }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
