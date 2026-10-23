import { useState, type FormEvent } from 'react';
import { sheetStyles as form } from '@/shared/ui/BottomSheet';
import screen from '@/shared/ui/Screen.module.css';
import { signIn, signUp } from './authApi';

type Mode = 'signIn' | 'signUp';

const COPY: Record<Mode, { title: string; submit: string; switchText: string; switchAction: string }> = {
  signIn: {
    title: 'Entrar',
    submit: 'Entrar',
    switchText: 'Ainda não tem conta?',
    switchAction: 'Criar conta',
  },
  signUp: {
    title: 'Criar conta',
    submit: 'Criar conta',
    switchText: 'Já tem conta?',
    switchAction: 'Entrar',
  },
};

/** Login e cadastro na mesma tela: só os campos e textos mudam. */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = COPY[mode];
  const isSignUp = mode === 'signUp';

  function switchMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (isSignUp && !displayName.trim()) return setError('Escreva o nome que vai aparecer no app.');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUp({ email, password, displayName });
        if (needsEmailConfirmation) {
          setInfo(`Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail, toque no link e depois entre aqui.`);
          setMode('signIn');
        }
      } else {
        await signIn(email, password);
      }
      // Login com sucesso: o AuthGate percebe a sessão nova e troca de tela sozinho.
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={screen.screen}>
      <header className={screen.brand}>
        <h1 className={screen.title}>Mesa pra Dois</h1>
        <p className={screen.tagline}>O diário de restaurantes de vocês dois.</p>
      </header>

      <form className={screen.card} onSubmit={handleSubmit} noValidate>
        <h2 className={screen.cardTitle}>{copy.title}</h2>

        {isSignUp && (
          <label className={form.field}>
            <span className={form.label}>Seu nome</span>
            <input
              className={form.input}
              autoComplete="given-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}

        <label className={form.field}>
          <span className={form.label}>E-mail</span>
          <input
            className={form.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className={form.field}>
          <span className={form.label}>
            Senha {isSignUp && <span className={form.optional}>(mínimo 6 caracteres)</span>}
          </span>
          <input
            className={form.input}
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && (
          <p role="alert" className={form.error}>
            {error}
          </p>
        )}
        {info && (
          <p role="status" className={form.info}>
            {info}
          </p>
        )}

        <button type="submit" className={form.primary} disabled={isSubmitting}>
          {isSubmitting ? 'Aguarde…' : copy.submit}
        </button>
      </form>

      <p className={screen.footer}>
        {copy.switchText}
        <button type="button" className={form.textButton} onClick={switchMode}>
          {copy.switchAction}
        </button>
      </p>
    </main>
  );
}
