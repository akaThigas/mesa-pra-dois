import { getSupabaseClient } from '@/shared/lib/supabase';
import type { RestaurantRepository } from './RestaurantRepository';
import {
  toRatingChange,
  toRestaurant,
  toRestaurantChange,
  toRowValues,
  type RatingRow,
  type RestaurantRow,
  type RestaurantWithRatingsRow,
} from './mappers';

const TABLE = 'restaurants';

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export const supabaseRestaurantRepository: RestaurantRepository = {
  async list(coupleId) {
    // Join pela FK: cada restaurante já vem com o array das notas.
    const { data, error } = await getSupabaseClient()
      .from(TABLE)
      .select('*, ratings(profile_id, rating)')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    throwIfError(error);
    return (data as RestaurantWithRatingsRow[]).map(toRestaurant);
  },

  subscribe(coupleId, onChange) {
    const supabase = getSupabaseClient();
    const filter = `couple_id=eq.${coupleId}`;

    // Um canal, dois "ouvintes": um por tabela.
    const channel = supabase
      .channel(`couple:${coupleId}`)
      .on<RestaurantRow>('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter }, (payload) => {
        const change = toRestaurantChange(payload);
        if (change) onChange(change);
      })
      .on<RatingRow>('postgres_changes', { event: '*', schema: 'public', table: 'ratings', filter }, (payload) => {
        const change = toRatingChange(payload);
        if (change) onChange(change);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  async create(input) {
    const { data, error } = await getSupabaseClient()
      .from(TABLE)
      .insert(toRowValues(input))
      .select('*, ratings(profile_id, rating)')
      .single();

    throwIfError(error);
    return toRestaurant(data as RestaurantWithRatingsRow);
  },

  async update(id, patch) {
    const { error } = await getSupabaseClient().from(TABLE).update(toRowValues(patch)).eq('id', id);
    throwIfError(error);
  },

  async remove(id) {
    const { error } = await getSupabaseClient().from(TABLE).delete().eq('id', id);
    throwIfError(error);
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
  },
};
