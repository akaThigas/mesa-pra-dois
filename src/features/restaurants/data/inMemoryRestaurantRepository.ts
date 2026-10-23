import { setMemberRating } from '../domain/ratings';
import type { Restaurant, RestaurantChange, RestaurantFields } from '../types';
import type { RestaurantRepository } from './RestaurantRepository';

const simulateLatency = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/** Separa os campos da tabela "restaurants" (o que o realtime dela enviaria). */
function fieldsOf({ ratings: _ratings, ...fields }: Restaurant): RestaurantFields {
  return fields;
}

/**
 * Implementação em memória do mesmo contrato.
 * Imita o comportamento do Supabase, inclusive o "tempo real":
 * toda escrita notifica os inscritos, com os mesmos tipos de evento.
 */
export function createInMemoryRestaurantRepository(
  seed: Restaurant[],
  currentUserId: string,
): RestaurantRepository {
  let rows = [...seed];
  const listeners = new Set<(change: RestaurantChange) => void>();

  const emit = (change: RestaurantChange) => listeners.forEach((listener) => listener(change));
  const now = () => new Date().toISOString();

  function findOrThrow(id: string): Restaurant {
    const found = rows.find((row) => row.id === id);
    if (!found) throw new Error('Restaurante não encontrado');
    return found;
  }

  function save(updated: Restaurant) {
    rows = rows.map((row) => (row.id === updated.id ? updated : row));
  }

  return {
    async list(coupleId) {
      await simulateLatency();
      return rows.filter((row) => row.coupleId === coupleId);
    },

    subscribe(coupleId, onChange) {
      const listener = (change: RestaurantChange) => {
        if (change.type !== 'upsert' || change.restaurant.coupleId === coupleId) onChange(change);
      };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async create(input) {
      await simulateLatency(150);
      const timestamp = now();
      const restaurant: Restaurant = {
        id: crypto.randomUUID(),
        category: 'restaurante',
        priceLevel: null,
        amountSpent: null,
        acceptsVr: false,
        ratings: [],
        notes: null,
        cuisine: null,
        neighborhood: null,
        address: null,
        latitude: null,
        longitude: null,
        googlePlaceId: null,
        visitedAt: null,
        createdBy: currentUserId,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...input,
      };
      rows = [restaurant, ...rows];
      emit({ type: 'upsert', restaurant: fieldsOf(restaurant) });
      return restaurant;
    },

    async update(id, patch) {
      await simulateLatency(150);
      const updated: Restaurant = { ...findOrThrow(id), ...patch, updatedAt: now() };
      save(updated);
      emit({ type: 'upsert', restaurant: fieldsOf(updated) });
    },

    async remove(id) {
      await simulateLatency(150);
      rows = rows.filter((row) => row.id !== id);
      emit({ type: 'delete', id });
    },

    async recordVisit(restaurantId, { visitedAt, amountSpent, notes, myRating }) {
      await simulateLatency(250);
      const current = findOrThrow(restaurantId);
      const updated: Restaurant = {
        ...current,
        status: 'visited',
        visitedAt,
        amountSpent,
        notes,
        ratings: myRating === null ? current.ratings : setMemberRating(current.ratings, currentUserId, myRating),
        updatedAt: now(),
      };
      save(updated);

      // Mesmos dois eventos que o Supabase mandaria (duas tabelas).
      emit({ type: 'upsert', restaurant: fieldsOf(updated) });
      if (myRating !== null) {
        emit({ type: 'rating', restaurantId, profileId: currentUserId, rating: myRating });
      }
    },
  };
}
