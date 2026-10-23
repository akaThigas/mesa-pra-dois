import { useState, type FormEvent } from 'react';
import { sheetStyles as form } from '@/shared/ui/BottomSheet';
import screen from '@/shared/ui/Screen.module.css';
import { createCouple, joinCouple, normalizeInviteCode } from './coupleApi';

interface CoupleSetupScreenProps {
  displayName: string;
  /** Chamado depois de criar/entrar: o AuthGate recarrega e mostra o app. */
  onDone: () => void;
  onSignOut: () => void;
}

/** Primeiro acesso: quem chega primeiro cria o casal; o outro entra com o código. */
export function CoupleSetupScreen({ displayName, onDone, onSignOut }: CoupleSetupScreenProps) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'create' | 'join', task: () => Promise<void>) {
    setError(null);
    setPending(action);
    try {
      await task();
      onDone();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Algo deu errado. Tente de novo.');
      setPending(null);
    }
  }

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return setError('O código tem 6 letras e números.');
    void run('join', () => joinCouple(code));
  }

  return (
    <main className={screen.screen}>
      <header className={screen.brand}>
        <h1 className={screen.title}>Oi, {displayName}!</h1>
        <p className={screen.tagline}>Falta só juntar vocês dois na mesma conta de casal.</p>
      </header>

      <section className={screen.card} aria-labelledby="create-title">
        <h2 id="create-title" className={screen.cardTitle}>
          Cheguei primeiro
        </h2>
        <p className={screen.cardText}>Crie o casal e receba um código para mandar ao seu par.</p>
        <button
          type="button"
          className={form.primary}
          disabled={pending !== null}
          onClick={() => void run('create', createCouple)}
        >
          {pending === 'create' ? 'Criando…' : 'Criar nosso casal'}
        </button>
      </section>

      <form className={screen.card} onSubmit={handleJoin} aria-labelledby="join-title" noValidate>
        <h2 id="join-title" className={screen.cardTitle}>
          Recebi um código
        </h2>
        <label className={form.field}>
          <span className={form.label}>Código do casal</span>
          <input
            className={form.input}
            value={code}
            onChange={(event) => setCode(normalizeInviteCode(event.target.value))}
            placeholder="A3F9K2"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{ letterSpacing: '0.2em', fontWeight: 600 }}
          />
        </label>
        <button type="submit" className={form.secondary} disabled={pending !== null}>
          {pending === 'join' ? 'Entrando…' : 'Entrar no casal'}
        </button>
      </form>

      {error && (
        <p role="alert" className={form.error}>
          {error}
        </p>
      )}

      <p className={screen.footer}>
        <button type="button" className={form.textButton} onClick={onSignOut}>
          Sair desta conta
        </button>
      </p>
    </main>
  );
}
