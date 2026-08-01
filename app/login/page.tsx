import { redirect } from 'next/navigation';
import { getSession, landingFor } from '../../src/lib/auth/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Already signed in: send them where their role belongs rather than showing a second login.
  const session = await getSession();
  if (session) redirect(landingFor(session.role));

  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--color-base)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <svg viewBox="0 0 100 100" className="size-6" aria-hidden>
            <polygon
              points="50,1 55.4,33.9 79.4,9.6 63.9,40 97.6,34.6 67.5,50 97.6,65.4 63.9,60 79.4,90.4 55.4,66.1 50,99 44.6,66.1 20.6,90.4 36.1,60 2.4,65.4 32.5,50 2.4,34.6 36.1,40 20.6,9.6 44.6,33.9"
              fill="var(--color-brand)"
            />
          </svg>
          <span className="font-[var(--font-display)] text-[15px] font-bold tracking-tight text-[var(--color-ink)]">
            shipfaster
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <h1 className="font-[var(--font-display)] text-xl font-bold text-[var(--color-ink)]">
            Sign in
          </h1>
          <p className="mb-5 mt-1 text-[13px] text-[var(--color-muted)]">
            Use the email your workspace owner set up for you.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
