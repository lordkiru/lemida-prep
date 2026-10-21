// The placeholder every page shows until it is built. No real content yet.
export default function ComingSoon({ title }) {
  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="page-title">
      <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
        {title}
      </h1>
      <p className="mb-4 text-muted">This part of Exam Prep is on its way.</p>
      <span className="chip-amber">Coming soon</span>
    </section>
  )
}
