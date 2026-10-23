import { getSupabaseClient } from '@/shared/lib/supabase';
import type { RestaurantChange } from '../types';
import type { RestaurantRepository } from './RestaurantRepository';
import {
  toRatingChange,
  toRestaurant,
  toRestaurantChange,
  toRowValues,
  withoutRatings,
  type RatingRow,
  type RestaurantRow,
  type RestaurantWithRatingsRow,
} from './mappers';

const TABLE = 'restaurants';
const SELECT_WITH_RATINGS = '*, ratings(profile_id, rating)';

function throwIfError(error: { message: string; code?: string } | null): void {
  if (!error) return;
  // PGRST116 = nenhuma linha voltou: não existe mais ou o RLS não deixou ver.
  if (error.code === 'PGRST116') throw new Error('Restaurante não encontrado (talvez já tenha sido excluído).');
  throw new Error(error.message);
}

/*
 * ECO LOCAL
 * Depois que o banco confirma uma escrita, avisamos na hora quem está
 * inscrito NESTA aba, sem esperar o tempo real. Motivos:
 *  - eventos DELETE do Supabase Realtime não respeitam filtros de coluna;
 *  - se a conexão de tempo real cair, a própria pessoa ainda vê o que fez.
 * O reducer (applyRestaurantChange) é idempotente: se o evento de tempo
 * real chegar depois, nada duplica.
 */
type Listener = (change: RestaurantChange) => void;
const localListeners = new Set<Listener>();
const emitLocal = (change: RestaurantChange) => localListeners.forEach((listener) => listener(change));

/** Busca um restaurante com as notas e emite o estado atual dele. */
async function emitFreshRestaurant(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient().from(TABLE).select(SELECT_WITH_RATINGS).eq('id', id).single();
  throwIfError(error);
  const restaurant = toRestaurant(data as RestaurantWithRatingsRow);
  emitLocal({ type: 'upsert', restaurant: withoutRatings(restaurant) });
  restaurant.ratings.forEach(({ profileId, rating }) => emitLocal({ type: 'rating', restaurantId: id, profileId, rating }));
}

export const supabaseRestaurantRepository: RestaurantRepository = {
  async list(coupleId) {
    // Join pela FK: cada restaurante já vem com o array das notas.
    const { data, error } = await getSupabaseClient()
      .from(TABLE)
      .select(SELECT_WITH_RATINGS)
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    throwIfError(error);
    return (data as RestaurantWithRatingsRow[]).map(toRestaurant);
  },

  subscribe(coupleId, onChange) {
    const supabase = getSupabaseClient();
    const filter = `couple_id=eq.${coupleId}`;

    const onRestaurant = (payload: Parameters<typeof toRestaurantChange>[0]) => {
      const change = toRestaurantChange(payload);
      if (change) onChange(change);
    };
    const onRating = (payload: Parameters<typeof toRatingChange>[0]) => {
      const change = toRatingChange(payload);
      if (change) onChange(change);
    };

    // INSERT/UPDATE: filtrados pelo casal. DELETE: SEM filtro, porque o
    // Supabase não aplica filtros a exclusões (o evento só traz a chave
    // primária). Ids de outros casais são ignorados pelo reducer.
    const channel = supabase
      .channel(`couple:${coupleId}`)
      .on<RestaurantRow>('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE, filter }, onRestaurant)
      .on<RestaurantRow>('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter }, onRestaurant)
      .on<RestaurantRow>('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, onRestaurant)
      .on<RatingRow>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ratings', filter }, onRating)
      .on<RatingRow>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ratings', filter }, onRating)
      .on<RatingRow>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ratings' }, onRating)
      .subscribe();

    const localListener: Listener = (change) => {
      if (change.type !== 'upsert' || change.restaurant.coupleId === coupleId) onChange(change);
    };
    localListeners.add(localListener);

    return () => {
      localListeners.delete(localListener);
      void supabase.removeChannel(channel);
    };
  },

  async create(input) {
    const { data, error } = await getSupabaseClient()
      .from(TABLE)
      .insert(toRowValues(input))
      .select(SELECT_WITH_RATINGS)
      .single();

    throwIfError(error);
    const restaurant = toRestaurant(data as RestaurantWithRatingsRow);
    emitLocal({ type: 'upsert', restaurant: withoutRatings(restaurant) });
    return restaurant;
  },

  async update(id, patch) {
    const { data, error } = await getSupabaseClient()
      .from(TABLE)
      .update(toRowValues(patch))
      .eq('id', id)
      .select()
      .single();

    throwIfError(error);
    emitLocal({ type: 'upsert', restaurant: withoutRatings(toRestaurant({ ...(data as RestaurantRow), ratings: [] })) });
  },

  async remove(id) {
    // .select('id') devolve as linhas apagadas: se vier vazio, o RLS bloqueou
    // ou o item já não existia. Sem isso, a falha seria silenciosa.
    const { data, error } = await getSupabaseClient().from(TABLE).delete().eq('id', id).select('id');
    throwIfError(error);
    if (!data || data.length === 0) throw new Error('Não foi possível excluir: o restaurante não foi encontrado.');
    emitLocal({ type: 'delete', id });
  },

  async recordVisit(restaurantId, details) {
    // Chama a função SQL record_visit (migração 002): tudo numa transação.
    const { error } = await getSupabaseClient().rpc('record_visit', {
      p_restaurant_id: restaurantId,
      p_visited_at: details.visitedAt,
      p_amount_spent: details.amountSpent,
      p_notes: details.notes,
      p_rating: details.myRating,
    });
    throwIfError(error);
    await emitFreshRestaurant(restaurantId);
  },
};
