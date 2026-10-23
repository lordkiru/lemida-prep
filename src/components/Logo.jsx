// The Exam Prep medal, swapped with the theme:
//   dark mode   public/logo.svg          the medal on its navy tile
//   light mode  public/logo-no-tile.svg  the medal on its own
// Both are shown as <img>, never pasted inline as <svg>: the two files use the same gradient ids, so inline copies on one page would
// clash and draw wrongly. Only one of the two <img> is ever displayed (the other is display:none, so it is not read out either).
export default function Logo({ size = 40, className = '' }) {
  const common = { alt: 'Lemida Exam Prep', width: size, height: size }
  return (
    <>
      <img {...common} src="/logo-no-tile.svg" className={`dark:hidden ${className}`} />
      <img {...common} src="/logo.svg" className={`hidden dark:block ${className}`} />
    </>
  )
}
