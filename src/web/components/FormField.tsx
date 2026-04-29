import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react';

type Props = {
  label: string;
  children: ReactNode;
};

export function FormField({ label, children }: Props) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}
