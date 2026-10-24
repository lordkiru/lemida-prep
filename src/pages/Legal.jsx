import { Link } from 'react-router-dom'

// The Privacy Policy and the Terms of Use, in plain language. Both are public pages (no sign-in needed), linked from sign-up and the page footers.
// They describe what the app really does today: if the app starts to collect or share something new (analytics, payments, advertising), update
// this text first.
const UPDATED = '23 October 2026'
const CONTACT = 'festus.a@lemidaitsolutions.com'

function Page({ title, children }) {
  return (
    <article className="glass p-6 sm:p-8" aria-labelledby="legal-title">
      <h1 id="legal-title" className="mb-1 text-2xl font-extrabold">
        {title}
      </h1>
      <p className="mb-6 text-sm text-muted">Last updated {UPDATED}</p>
      <div className="grid gap-5 leading-relaxed">{children}</div>
      <p className="mb-0 mt-8 text-sm">
        <Link to="/" className="link font-semibold">
          Back to Exam Prep
        </Link>
      </p>
    </article>
  )
}

const H = ({ children }) => <h2 className="mb-0 mt-2 text-lg font-extrabold">{children}</h2>
const Ul = ({ children }) => <ul className="m-0 grid list-disc gap-1.5 pl-5">{children}</ul>

export function Privacy() {
  return (
    <Page title="Privacy policy">
      <p className="m-0">
        Lemida Exam Prep is a practice app for SS2 and SS3 students, run by Lemida IT Solutions (&ldquo;we&rdquo;). This page explains what we keep about you, why, who helps us
        run the app, and how to have it deleted. We have tried to keep it short and plain.
      </p>

      <H>What we keep</H>
      <Ul>
        <li>
          <strong>Your account:</strong> your name, your email address, and your password. The password is never stored as you typed it: we keep only a scrambled version
          that cannot be turned back into the password.
        </li>
        <li>
          <strong>Your setup:</strong> the exam you are preparing for, your class, the year you will sit the exam, and the subjects you chose.
        </li>
        <li>
          <strong>Your practice:</strong> the rounds you started, the answers you gave, and which questions you got right or wrong, so we can show your progress and
          your results.
        </li>
        <li>
          <strong>Referrals:</strong> if you sign up through a referral link or code, this is recorded against the marketer who shared it.
        </li>
        <li>
          <strong>Technical information:</strong> when you use the app, our hosting records the address of your device (your IP address) and which page was asked
          for. We use this only to keep the service secure and to find and fix faults. It is kept by our hosting providers for a limited time.
        </li>
      </Ul>
      <p className="m-0">
        We do <strong>not</strong> show advertising, we do <strong>not</strong> sell your information, and the app does not use advertising or tracking cookies or
        analytics. It uses one small cookie that keeps you signed in. It is needed for the app to work, and it is removed when you sign out.
      </p>

      <H>Why we keep it</H>
      <p className="m-0">
        To let you sign in, to confirm your email address, to give you questions for your exam and subjects, to show your results and progress, to keep the service secure,
        and to find mistakes in our questions. We do not use your information for anything else without asking you first.
      </p>

      <H>Who helps us run the app</H>
      <p className="m-0">
        We use trusted companies to run parts of the service. They handle your information only to do that job for us:
      </p>
      <Ul>
        <li>Microsoft Azure runs our servers.</li>
        <li>MongoDB Atlas stores our database.</li>
        <li>Cloudflare delivers the website and protects it from attacks.</li>
        <li>Brevo sends the emails (to confirm your email, and to reset your password).</li>
        <li>Sentry tells us when something breaks, using technical error reports.</li>
      </Ul>
      <p className="m-0">Some of these companies handle information outside Nigeria. We choose providers that protect it, and we do not allow them to use it for their own purposes.</p>

      <H>Students under 18</H>
      <p className="m-0">
        Many of our students are under 18. If you are, please ask a parent or guardian before you sign up, and show them this page. A parent or guardian can ask us to show or
        delete a child&rsquo;s information at any time, using the address below.
      </p>

      <H>How long we keep it</H>
      <Ul>
        <li>If you never confirm your email address, the half-finished account is deleted automatically after 7 days.</li>
        <li>Otherwise we keep your account until you delete it.</li>
        <li>When you delete your account, your account, setup, practice rounds and progress are deleted straight away. Copies in our backups disappear as the backups are replaced in the normal way.</li>
      </Ul>

      <H>Your rights</H>
      <p className="m-0">You can ask to see what we keep about you, to correct it, or to have it deleted, and you can withdraw your permission at any time.</p>
      <Ul>
        <li>
          <strong>Delete it yourself:</strong> sign in, open <Link to="/profile" className="link font-semibold">Profile</Link> and choose &ldquo;Delete my account&rdquo;. You will be asked for your password.
        </li>
        <li>
          <strong>Anything else:</strong> email us at <a href={`mailto:${CONTACT}`} className="link font-semibold">{CONTACT}</a>. We will answer as quickly as we can.
        </li>
        <li>
          If you are unhappy with how we handle your information, you may complain to the Nigeria Data Protection Commission.
        </li>
      </Ul>

      <H>Keeping it safe</H>
      <p className="m-0">
        The app only works over a secure connection, passwords are stored scrambled, and our servers and database are protected by their providers&rsquo; security. No online
        service can promise perfect security, but we work to keep your information safe and we fix problems quickly.
      </p>

      <H>Changes</H>
      <p className="m-0">If we change this page in a way that matters, we will say so in the app. The date at the top shows when it was last updated.</p>
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Terms of use">
      <p className="m-0">
        By creating an account you agree to these terms and to our <Link to="/privacy" className="link font-semibold">privacy policy</Link>. If you are under 18, please make sure a parent or
        guardian is happy for you to use the app.
      </p>

      <H>What Exam Prep is</H>
      <p className="m-0">
        Lemida Exam Prep is a practice tool made by Lemida IT Solutions. It helps you practise with questions for SS2 and SS3 subjects. It is independent: it is not run by,
        or connected to, WAEC or NECO. Practising here cannot promise any result in a real exam.
      </p>

      <H>Your account</H>
      <Ul>
        <li>Give your real name and an email address you can read. Keep your password to yourself.</li>
        <li>An account is for one person. Signing in on a new device signs you out of the old one.</li>
        <li>You can delete your account whenever you like from your Profile.</li>
      </Ul>

      <H>Using the questions</H>
      <Ul>
        <li>The questions and explanations belong to Lemida. They are for your own practice.</li>
        <li>Please do not copy, collect or share them in bulk, or use programs to download them.</li>
        <li>We check our questions carefully, but a question can still contain a mistake. If you find one, please tell us.</li>
      </Ul>

      <H>Fair use</H>
      <p className="m-0">
        Do not try to break into the app, overload it, or use someone else&rsquo;s account. We may suspend an account that is used to do any of these things.
      </p>

      <H>The service</H>
      <p className="m-0">
        We work hard to keep Exam Prep running, but we cannot promise it will always be available or free from faults, and we may change or add features. The app is free today; if we
        introduce paid plans we will explain them clearly before you are asked to pay anything.
      </p>

      <H>Changes and contact</H>
      <p className="m-0">
        We may update these terms, and we will say so in the app when we do. Questions about these terms can be sent to{' '}
        <a href={`mailto:${CONTACT}`} className="link font-semibold">{CONTACT}</a>. These terms are governed by the laws of Nigeria.
      </p>
    </Page>
  )
}
