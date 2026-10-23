import type { NewRestaurant, Restaurant, RestaurantChange, RestaurantPatch, VisitDetails } from '../types';

export type Unsubscribe = () => void;

/**
 * CONTRATO de acesso a dados (Repository Pattern).
 *
 * Hooks e componentes dependem desta interface, nunca do Supabase direto
 * (Princípio da Inversão de Dependência — o "D" do SOLID). Assim:
 *  - dá para trocar Supabase por Firebase mexendo só em data/;
 *  - o modo demonstração usa uma implementação em memória;
 *  - testes podem injetar um repositório falso.
 */
export interface RestaurantRepository {
  /** Restaurantes do casal JÁ com as notas de cada um. */
  list(coupleId: string): Promise<Restaurant[]>;
  subscribe(coupleId: string, onChange: (change: RestaurantChange) => void): Unsubscribe;
  create(input: NewRestaurant): Promise<Restaurant>;
  update(id: string, patch: RestaurantPatch): Promise<void>;
  remove(id: string): Promise<void>;
  /** Marca como visitado e grava a nota de QUEM ESTÁ LOGADO, numa operação atômica. */
  recordVisit(restaurantId: string, details: VisitDetails): Promise<void>;
}
