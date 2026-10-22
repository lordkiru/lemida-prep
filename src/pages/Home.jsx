import { useAuth } from '../auth/authContext'
import { examLabel } from '../auth/rules'

// The home page. For now it greets the student; practice, mocks and mistakes are built in the next steps.
export default function Home() {
  const { user } = useAuth()
  const first = (user.name || '').split(' ')[0]
  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="page-title">
      <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
        {first ? `Hi, ${first}` : 'Hi'}
      </h1>
      <p className="mb-4 text-muted">
        You are preparing for {examLabel(user.exam)} {user.examYear} in {user.classLevel}, with {user.subjects.length} subject{user.subjects.length === 1 ? '' : 's'}.
      </p>
      <p className="mb-4">Practice, mocks and your mistakes list are on their way.</p>
      <span className="chip-amber">Coming soon</span>
    </section>
  )
}
