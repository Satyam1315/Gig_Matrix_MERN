export function Loading() {
  return <div className="loading">Loading…</div>;
}

export function Alert({ error, success }) {
  if (!error && !success) return null;
  return <div className={`notice ${error ? "notice-error" : "notice-success"}`} role="status">{error || success}</div>;
}

export function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function FormField({ label, children, className = "" }) {
  return <label className={`form-field ${className}`}><span>{label}</span>{children}</label>;
}

export function EmptyState({ title, detail, action }) {
  return <section className="empty-state"><span className="empty-mark">✦</span><h2>{title}</h2><p>{detail}</p>{action}</section>;
}
