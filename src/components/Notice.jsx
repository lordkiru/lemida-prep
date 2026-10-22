// A short message in a coloured box. Errors are announced at once (role="alert"); information and success politely (role="status").
// Colour is never the only sign: each kind also starts with a word-like icon and the text itself says what happened.
const KINDS = {
  error: { cls: 'notice notice-error', role: 'alert', icon: '!' },
  success: { cls: 'notice notice-success', role: 'status', icon: '✓' },
  info: { cls: 'notice notice-info', role: 'status', icon: 'i' },
}

export default function Notice({ kind = 'info', children, className = '' }) {
  const k = KINDS[kind]
  return (
    <div className={`${k.cls} ${className}`} role={k.role}>
      <span aria-hidden="true" className="notice-icon">
        {k.icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
