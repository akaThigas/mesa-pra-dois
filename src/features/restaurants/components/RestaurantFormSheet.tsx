import { useId, useState, type FormEvent } from 'react';
import { useCoupleSession } from '@/features/couple/CoupleSessionContext';
import { BottomSheet, sheetStyles as form } from '@/shared/ui/BottomSheet';
import { Chip } from '@/shared/ui/Chip';
import type { Category, NewRestaurant, PriceLevel, Restaurant, RestaurantPatch, RestaurantStatus } from '../types';
import { CATEGORIES, PRICE_LEVELS, STATUS_LABEL } from '../types';
import { AddressSearch, type SelectedPlace } from './AddressSearch';
import styles from './RestaurantFormSheet.module.css';

/** null = fechado · create = novo na aba atual · edit = alterar existente */
export type RestaurantFormTarget =
  | { mode: 'create'; status: RestaurantStatus; category: Category }
  | { mode: 'edit'; restaurant: Restaurant }
  | null;

interface RestaurantFormSheetProps {
  target: RestaurantFormTarget;
  onClose: () => void;
  onCreate: (input: NewRestaurant) => Promise<void>;
  onUpdate: (id: string, patch: RestaurantPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function RestaurantFormSheet({ target, onClose, ...actions }: RestaurantFormSheetProps) {
  const titleId = useId();
  // key: cada abertura começa com o formulário limpo (ou com os dados daquele restaurante).
  const formKey = target?.mode === 'edit' ? target.restaurant.id : `new-${target?.status}-${target?.category}`;

  return (
    <BottomSheet open={target !== null} onClose={onClose} labelledBy={titleId}>
      {target && <RestaurantForm key={formKey} target={target} titleId={titleId} onClose={onClose} {...actions} />}
    </BottomSheet>
  );
}

interface RestaurantFormProps extends Omit<RestaurantFormSheetProps, 'target'> {
  target: NonNullable<RestaurantFormTarget>;
  titleId: string;
}

function RestaurantForm({ target, titleId, onClose, onCreate, onUpdate, onDelete }: RestaurantFormProps) {
  const { coupleId } = useCoupleSession();
  const editing = target.mode === 'edit' ? target.restaurant : null;

  const [name, setName] = useState(editing?.name ?? '');
  const [category, setCategory] = useState<Category>(
    editing?.category ?? (target.mode === 'create' ? target.category : 'restaurante'),
  );
  const [cuisine, setCuisine] = useState(editing?.cuisine ?? '');
  const [neighborhood, setNeighborhood] = useState(editing?.neighborhood ?? '');
  const [priceLevel, setPriceLevel] = useState<PriceLevel | null>(editing?.priceLevel ?? null);
  const [acceptsVr, setAcceptsVr] = useState(editing?.acceptsVr ?? false);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [place, setPlace] = useState<SelectedPlace | null>(
    editing?.address && editing.latitude !== null && editing.longitude !== null
      ? {
          address: editing.address,
          latitude: editing.latitude,
          longitude: editing.longitude,
          googlePlaceId: editing.googlePlaceId,
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function runAndClose(task: () => Promise<void>) {
    setError(null);
    setIsSaving(true);
    try {
      await task();
      onClose();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Não foi possível salvar. Tente de novo.');
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError('Dê um nome ao lugar.');

    const values = {
      name: name.trim(),
      category,
      cuisine: cuisine.trim() || null,
      neighborhood: neighborhood.trim() || null,
      priceLevel,
      acceptsVr,
      notes: notes.trim() || null,
      address: place?.address ?? null,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
      googlePlaceId: place?.googlePlaceId ?? null,
    } satisfies RestaurantPatch;

    void runAndClose(() =>
      editing ? onUpdate(editing.id, values) : onCreate({ ...values, coupleId, status: target.mode === 'create' ? target.status : 'wishlist' }),
    );
  }

  function handleDelete() {
    if (!editing) return;
    // Exclusão em dois toques: evita apagar sem querer, sem abrir outro diálogo.
    if (!confirmDelete) return setConfirmDelete(true);
    void runAndClose(() => onDelete(editing.id));
  }

  return (
    <form className={form.form} onSubmit={handleSubmit} noValidate>
      <div className={form.grip} aria-hidden="true" />
      <div>
        <h2 id={titleId} className={form.title}>
          {editing ? `Editar ${editing.name}` : 'Novo lugar'}
        </h2>
        {!editing && target.mode === 'create' && (
          <p className={form.subtitle}>Vai para a lista “{STATUS_LABEL[target.status]}”.</p>
        )}
      </div>

      <label className={form.field}>
        <span className={form.label}>Nome</span>
        <input
          className={form.input}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null); // erro antigo some assim que a pessoa corrige
          }}
          maxLength={120}
          autoComplete="off"
          required
        />
      </label>

      <fieldset className={styles.fieldset}>
        <legend className={form.label}>Tipo de lugar</legend>
        <div className={styles.chips}>
          {CATEGORIES.map(({ value, label }) => (
            <Chip key={value} selected={category === value} onToggle={() => setCategory(value)}>
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className={styles.row}>
        <label className={form.field}>
          <span className={form.label}>
            Culinária <span className={form.optional}>(opcional)</span>
          </span>
          <input className={form.input} value={cuisine} onChange={(event) => setCuisine(event.target.value)} placeholder="Japonesa" />
        </label>
        <label className={form.field}>
          <span className={form.label}>
            Bairro <span className={form.optional}>(opcional)</span>
          </span>
          <input
            className={form.input}
            value={neighborhood}
            onChange={(event) => setNeighborhood(event.target.value)}
            placeholder="Liberdade"
          />
        </label>
      </div>

      <AddressSearch
        value={place}
        suggestion={name.trim()}
        onSelect={(selected) => {
          setPlace(selected);
          // Preenche nome e bairro sozinhos, sem apagar o que a pessoa já digitou.
          if (selected?.googlePlaceId && !name.trim()) setName(selected.label);
          if (selected?.neighborhood && !neighborhood.trim()) setNeighborhood(selected.neighborhood);
        }}
      />

      <fieldset className={styles.fieldset}>
        <legend className={form.label}>Faixa de preço</legend>
        <div className={styles.chips}>
          {PRICE_LEVELS.map((level) => (
            <Chip
              key={level}
              selected={priceLevel === level}
              onToggle={() => setPriceLevel(priceLevel === level ? null : level)}
              ariaLabel={`Faixa de preço ${level} de 4`}
            >
              {'$'.repeat(level)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label className={form.check}>
        <input type="checkbox" checked={acceptsVr} onChange={(event) => setAcceptsVr(event.target.checked)} />
        Aceita VR (vale-refeição)
      </label>

      <label className={form.field}>
        <span className={form.label}>
          Observações <span className={form.optional}>(opcional)</span>
        </span>
        <textarea
          className={form.input}
          rows={3}
          maxLength={1000}
          placeholder="Prato para pedir, horário com fila, quem indicou…"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error && (
        <p role="alert" className={form.error}>
          {error}
        </p>
      )}

      <div className={form.buttons}>
        <button type="button" className={form.secondary} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className={form.primary} disabled={isSaving}>
          {isSaving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar'}
        </button>
      </div>

      {editing && (
        <button
          type="button"
          className={form.danger}
          data-armed={confirmDelete}
          onClick={handleDelete}
          disabled={isSaving}
        >
          {confirmDelete ? 'Toque de novo para excluir de vez' : 'Excluir lugar'}
        </button>
      )}
    </form>
  );
}
