export type RestaurantStatus = 'wishlist' | 'visited';

/** Tipo de lugar. Os valores batem com o CHECK da migração 003. */
export type Category = 'restaurante' | 'bar' | 'cafe' | 'padaria' | 'doceria' | 'sorveteria' | 'outro';

/** Ordem de exibição + rótulos no singular (etiqueta) e no plural (aba). */
export const CATEGORIES: readonly { value: Category; label: string; plural: string }[] = [
  { value: 'restaurante', label: 'Restaurante', plural: 'Restaurantes' },
  { value: 'bar', label: 'Bar', plural: 'Bares' },
  { value: 'cafe', label: 'Café', plural: 'Cafés' },
  { value: 'padaria', label: 'Padaria', plural: 'Padarias' },
  { value: 'doceria', label: 'Doceria', plural: 'Docerias' },
  { value: 'sorveteria', label: 'Sorveteria', plural: 'Sorveterias' },
  { value: 'outro', label: 'Outro', plural: 'Outros' },
];

export function categoryLabel(category: Category): string {
  return CATEGORIES.find(({ value }) => value === category)?.label ?? 'Outro';
}

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((entry) => entry.value === value);
}
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
  category: Category;
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
  | 'category'
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
  /** Código para o par entrar no casal (null no modo demonstração). */
  inviteCode: string | null;
}

export const PRICE_LEVELS: readonly PriceLevel[] = [1, 2, 3, 4];

export const STATUS_LABEL: Record<RestaurantStatus, string> = {
  wishlist: 'Para Conhecer',
  visited: 'Já Fomos',
};
