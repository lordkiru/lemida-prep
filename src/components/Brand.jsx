import Logo from './Logo'

// The logo with the name beside it: "Lemida" small above "Exam Prep" in bold. Used in the sidebar, the phone top bar and the pages
// before sign-in, so the product is named the same way everywhere.
export default function Brand({ size = 40, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} className="shrink-0" />
      <div className="leading-tight">
        <div className="text-xs font-semibold text-muted">Lemida</div>
        <div className="text-base font-extrabold">Exam Prep</div>
      </div>
    </div>
  )
}
