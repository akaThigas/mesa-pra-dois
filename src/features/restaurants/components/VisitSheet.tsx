import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { membersForDisplay, useCoupleSession } from '@/features/couple/CoupleSessionContext';
import { moneyToInput, parseMoney, todayIsoDate } from '@/shared/lib/format';
import { StarInput } from '@/shared/ui/StarInput';
import { StarRating } from '@/shared/ui/StarRating';
import { ratingOf } from '../domain/ratings';
import type { Rating, Restaurant, VisitDetails } from '../types';
import styles from './VisitSheet.module.css';

interface VisitSheetProps {
  /** null = gaveta fechada */
  restaurant: Restaurant | null;
  onClose: () => void;
  onSave: (restaurantId: string, details: VisitDetails) => Promise<void>;
}

/**
 * Gaveta inferior (bottom sheet) usando o <dialog> nativo:
 * foco preso dentro, Esc fecha e o fundo fica inerte — sem biblioteca.
 */
export function VisitSheet({ restaurant, onClose, onSave }: VisitSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (restaurant && !dialog.open) dialog.showModal();
    if (!restaurant && dialog.open) dialog.close();
  }, [restaurant]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      // Clique no fundo escuro (fora da gaveta) fecha.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {/* key = id: ao abrir outro restaurante, o formulário nasce limpo. */}
      {restaurant && (
        <VisitForm key={restaurant.id} restaurant={restaurant} titleId={titleId} onCancel={onClose} onSave={onSave} />
      )}
    </dialog>
  );
}

interface VisitFormProps {
  restaurant: Restaurant;
  titleId: string;
  onCancel: () => void;
  onSave: VisitSheetProps['onSave'];
}

function VisitForm({ restaurant, titleId, onCancel, onSave }: VisitFormProps) {
  const session = useCoupleSession();
  const partners = membersForDisplay(session).filter((member) => !member.isMe);

  // Estado inicial vem do que já existe (editar = mesma tela, pré-preenchida).
  const [myRating, setMyRating] = useState<Rating | null>(ratingOf(restaurant, session.currentUserId));
  const [amount, setAmount] = useState(moneyToInput(restaurant.amountSpent));
  const [visitedAt, setVisitedAt] = useState(restaurant.visitedAt ?? todayIsoDate());
  const [notes, setNotes] = useState(restaurant.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountSpent = parseMoney(amount);
    if (Number.isNaN(amountSpent)) {
      setError('Valor gasto inválido. Use só números, como 89,90.');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave(restaurant.id, {
        visitedAt,
        amountSpent,
        notes: notes.trim() || null,
        myRating,
      });
      onCancel(); // fecha a gaveta
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.grip} aria-hidden="true" />
      {/* Título neutro: "no/na" dependeria do gênero do nome do lugar. */}
      <div>
        <h2 id={titleId} className={styles.title}>
          {restaurant.name}
        </h2>
        <p className={styles.subtitle}>Registre como foi a visita.</p>
      </div>

      <StarInput label="Sua nota" value={myRating} onChange={setMyRating} />

      {partners.map((partner) => {
        const partnerRating = ratingOf(restaurant, partner.id);
        return (
          <p key={partner.id} className={styles.hint}>
            {partner.displayName}:{' '}
            {partnerRating === null ? 'ainda não avaliou' : <StarRating value={partnerRating} />}
          </p>
        );
      })}

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Quanto gastaram</span>
          <span className={styles.money}>
            <span aria-hidden="true">R$</span>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Quando</span>
          <input
            className={styles.input}
            type="date"
            max={todayIsoDate()}
            value={visitedAt}
            onChange={(event) => setVisitedAt(event.target.value)}
            required
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Observações</span>
        <textarea
          className={styles.input}
          rows={3}
          maxLength={1000}
          placeholder="O que pedir, o que evitar, se vale voltar…"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.buttons}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={styles.primary} disabled={isSaving}>
          {isSaving ? 'Salvando…' : 'Salvar visita'}
        </button>
      </div>
    </form>
  );
}
