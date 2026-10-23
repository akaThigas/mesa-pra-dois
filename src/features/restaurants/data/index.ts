import { isSupabaseConfigured } from '@/shared/lib/supabase';
import type { RestaurantRepository } from './RestaurantRepository';
import { createInMemoryRestaurantRepository } from './inMemoryRestaurantRepository';
import { DEMO_RESTAURANTS, DEMO_SESSION } from './seed';
import { supabaseRestaurantRepository } from './supabaseRestaurantRepository';

/** Composition root: o ÚNICO lugar que decide qual implementação usar. */
export const isMockMode = import.meta.env.VITE_USE_MOCK === 'true' || !isSupabaseConfigured();

export const restaurantRepository: RestaurantRepository = isMockMode
  ? createInMemoryRestaurantRepository(DEMO_RESTAURANTS, DEMO_SESSION.currentUserId)
  : supabaseRestaurantRepository;

export type { RestaurantRepository } from './RestaurantRepository';
