import { useState } from 'react';
import styles from './InviteBanner.module.css';

/** Aparece enquanto o par ainda não entrou no casal. */
export function InviteBanner({ code }: { code: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function share() {
    const text = `Entra no nosso Mesa pra Dois! Crie sua conta em ${window.location.origin} e use o código ${code}.`;
    try {
      // Celular: abre o menu de compartilhar (WhatsApp etc.). Computador: copia.
      if (navigator.share) {
        await navigator.share({ title: 'Mesa pra Dois', text });
      } else {
        await navigator.clipboard.writeText(text);
        setFeedback('Convite copiado');
      }
    } catch {
      // Cancelar o menu de compartilhar não é erro.
    }
  }

  return (
    <aside className={styles.banner} aria-label="Convidar seu par">
      <p className={styles.text}>
        Seu par ainda não entrou. Código do casal: <strong className={styles.code}>{code}</strong>
      </p>
      <button type="button" className={styles.button} onClick={() => void share()}>
        {feedback ?? 'Enviar convite'}
      </button>
    </aside>
  );
}
