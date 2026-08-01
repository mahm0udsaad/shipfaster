'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInAction } from '../../src/lib/actions/auth';

const inputClass =
  'w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)] focus:border-[var(--color-agent)]';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(signInAction, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@agency.com"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-[12px] text-[var(--color-blocked-2)]">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
