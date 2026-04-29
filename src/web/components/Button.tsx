import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function Button({ children, variant = 'primary', className = '', type = 'button', ...rest }: Props) {
  const cls = `button ${variant === 'secondary' ? 'is-secondary' : ''} ${className}`.trim();
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
