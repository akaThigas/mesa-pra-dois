import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { isCategory } from '../types';
import type {
  NewRestaurant,
  PriceLevel,
  Rating,
  Restaurant,
  RestaurantChange,
  RestaurantFields,
  RestaurantPatch,
  RestaurantStatus,
} from '../types';

/**
 * Formato exato das linhas no Postgres.
 * Dica: em projeto real, gere isso com `npx supabase gen types typescript`.
 */
export interface RestaurantRow {
  id: string;
  couple_id: string;
  name: string;
  status: RestaurantStatus;
  category: string;
  price_level: number | null;
  amount_spent: number | string | null; // numeric pode chegar como string
  accepts_vr: boolean;
  notes: string | null;
  cuisine: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  visited_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingRow {
  restaurant_id: string;
  couple_id: string;
  profile_id: string;
  rating: number;
}

/** Resultado do select com join: `select('*, ratings(profile_id, rating)')` */
export type RestaurantWithRatingsRow = RestaurantRow & {
  ratings: Pick<RatingRow, 'profile_id' | 'rating'>[];
};

/** Linha do banco → campos de domínio. Único ponto que conhece snake_case. */
export function toRestaurantFields(row: RestaurantRow): RestaurantFields {
  return {
    id: row.id,
    coupleId: row.couple_id,
    name: row.name,
    status: row.status,
    // Valor desconhecido (ou coluna ausente) vira 'restaurante': o app nunca quebra por isso.
    category: isCategory(row.category) ? row.category : 'restaurante',
    priceLevel: row.price_level as PriceLevel | null,
    amountSpent: row.amount_spent === null ? null : Number(row.amount_spent),
    acceptsVr: row.accepts_vr,
    notes: row.notes,
    cuisine: row.cuisine,
    neighborhood: row.neighborhood,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    visitedAt: row.visited_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRestaurant(row: RestaurantWithRatingsRow): Restaurant {
  return {
    ...toRestaurantFields(row),
    ratings: (row.ratings ?? []).map(({ profile_id, rating }) => ({
      profileId: profile_id,
      rating: rating as Rating,
    })),
  };
}

/** Só os campos da tabela restaurants (as notas vêm da tabela ratings). */
export function withoutRatings({ ratings: _ratings, ...fields }: Restaurant): RestaurantFields {
  return fields;
}

const FIELD_TO_COLUMN = {
  coupleId: 'couple_id',
  name: 'name',
  status: 'status',
  category: 'category',
  priceLevel: 'price_level',
  amountSpent: 'amount_spent',
  acceptsVr: 'accepts_vr',
  notes: 'notes',
  cuisine: 'cuisine',
  neighborhood: 'neighborhood',
  address: 'address',
  latitude: 'latitude',
  longitude: 'longitude',
  visitedAt: 'visited_at',
} as const satisfies Record<keyof NewRestaurant, keyof RestaurantRow>;

/** Domínio → colunas, ignorando campos não informados (útil para PATCH). */
export function toRowValues(input: NewRestaurant | RestaurantPatch): Partial<RestaurantRow> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => [FIELD_TO_COLUMN[field as keyof NewRestaurant], value]),
  );
}

/** Evento da tabela restaurants → evento de domínio. */
export function toRestaurantChange(
  payload: RealtimePostgresChangesPayload<RestaurantRow>,
): RestaurantChange | null {
  if (payload.eventType === 'DELETE') {
    // Em DELETE o Supabase manda só a chave primária em `old`.
    return payload.old.id ? { type: 'delete', id: payload.old.id } : null;
  }
  return { type: 'upsert', restaurant: toRestaurantFields(payload.new) };
}

/** Evento da tabela ratings → evento de domínio. */
export function toRatingChange(payload: RealtimePostgresChangesPayload<RatingRow>): RestaurantChange | null {
  if (payload.eventType === 'DELETE') {
    // A PK de ratings é (restaurant_id, profile_id): as duas vêm no `old`.
    const { restaurant_id, profile_id } = payload.old;
    return restaurant_id && profile_id
      ? { type: 'rating', restaurantId: restaurant_id, profileId: profile_id, rating: null }
      : null;
  }
  const { restaurant_id, profile_id, rating } = payload.new;
  return { type: 'rating', restaurantId: restaurant_id, profileId: profile_id, rating: rating as Rating };
}
