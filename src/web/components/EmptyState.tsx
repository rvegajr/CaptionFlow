import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ? (
        <span className="empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <h2 className="empty-state__title">{title}</h2>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  title,
  description,
  actions,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`.trim()}>
      {title || actions ? (
        <header className="card__header">
          <div>
            {title ? <h2 className="card__title">{title}</h2> : null}
            {description ? <p className="card__desc">{description}</p> : null}
          </div>
          {actions ? <div className="card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="card__body">{children}</div>
    </section>
  );
}
