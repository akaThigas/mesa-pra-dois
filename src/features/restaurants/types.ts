export type RestaurantStatus = 'wishlist' | 'visited';
export type PriceLevel = 1 | 2 | 3 | 4;
export type Rating = 1 | 2 | 3 | 4 | 5;

/** A nota que UMA pessoa do casal deu. */
export interface MemberRating {
  profileId: string;
  rating: Rating;
}

/**
 * Modelo de domínio usado pela UI.
 * Repare que ele NÃO é igual à linha do banco (snake_case):
 * a conversão acontece em um único lugar — data/mappers.ts.
 */
export interface Restaurant {
  id: string;
  coupleId: string;
  name: string;
  status: RestaurantStatus;
  priceLevel: PriceLevel | null;
  amountSpent: number | null;
  acceptsVr: boolean;
  /** Uma entrada por pessoa que já avaliou (0, 1 ou 2). */
  ratings: MemberRating[];
  notes: string | null;
  cuisine: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Data no formato YYYY-MM-DD */
  visitedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Os campos que moram na tabela restaurants (as notas vêm de outra tabela). */
export type RestaurantFields = Omit<Restaurant, 'ratings'>;

type EditableFields = Pick<
  Restaurant,
  | 'priceLevel'
  | 'amountSpent'
  | 'acceptsVr'
  | 'notes'
  | 'cuisine'
  | 'neighborhood'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'visitedAt'
>;

/** Dados para criar um restaurante: só o essencial é obrigatório. */
export type NewRestaurant = Pick<Restaurant, 'coupleId' | 'name' | 'status'> & Partial<EditableFields>;

/** Alteração parcial (PATCH) — o casal dono não muda. */
export type RestaurantPatch = Partial<Omit<NewRestaurant, 'coupleId'>>;

/** O que se registra ao contar como foi uma visita. */
export interface VisitDetails {
  visitedAt: string;
  amountSpent: number | null;
  notes: string | null;
  /** A nota de quem está registrando. null = não mexe na nota. */
  myRating: Rating | null;
}

/**
 * Evento de mudança vindo do tempo real, já traduzido para o domínio.
 * Union discriminada: o TypeScript obriga a tratar cada caso.
 * Restaurantes e notas chegam por canais separados (são tabelas separadas).
 */
export type RestaurantChange =
  | { type: 'upsert'; restaurant: RestaurantFields }
  | { type: 'delete'; id: string }
  | { type: 'rating'; restaurantId: string; profileId: string; rating: Rating | null };

export interface CoupleMember {
  id: string;
  displayName: string;
}

/** Quem está usando o app e com quem divide a conta. */
export interface CoupleSession {
  coupleId: string;
  currentUserId: string;
  members: CoupleMember[];
}

export const PRICE_LEVELS: readonly PriceLevel[] = [1, 2, 3, 4];

export const STATUS_LABEL: Record<RestaurantStatus, string> = {
  wishlist: 'Para Conhecer',
  visited: 'Já Fomos',
};
