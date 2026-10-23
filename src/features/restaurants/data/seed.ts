import type { CoupleSession, Restaurant } from '../types';

const DEMO_ME = 'demo-me';
const DEMO_PARTNER = 'demo-partner';

/** Sessão fictícia do modo demonstração. */
export const DEMO_SESSION: CoupleSession = {
  coupleId: 'demo-couple',
  currentUserId: DEMO_ME,
  members: [
    { id: DEMO_ME, displayName: 'Você' },
    { id: DEMO_PARTNER, displayName: 'Seu par' },
  ],
  inviteCode: null,
};

type SeedInput = Pick<Restaurant, 'name' | 'status'> & Partial<Restaurant>;

function seed(index: number, data: SeedInput): Restaurant {
  const createdAt = new Date(Date.UTC(2026, 8, 1 + index * 3, 15)).toISOString();
  return {
    id: `demo-${index}`,
    coupleId: DEMO_SESSION.coupleId,
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
    createdBy: DEMO_ME,
    createdAt,
    updatedAt: createdAt,
    ...data,
  };
}

/** Dados fictícios (coordenadas aproximadas dos bairros) para o modo demonstração. */
export const DEMO_RESTAURANTS: Restaurant[] = [
  seed(1, {
    name: 'Ramen Kazoku',
    status: 'wishlist',
    cuisine: 'Japonesa',
    neighborhood: 'Liberdade',
    latitude: -23.5587,
    longitude: -46.6347,
    priceLevel: 2,
    acceptsVr: true,
    notes: 'Pedir o tonkotsu. Chegar antes das 19h por causa da fila.',
  }),
  seed(2, {
    name: 'Bistrô Jardim Secreto',
    status: 'wishlist',
    cuisine: 'Francesa',
    neighborhood: 'Pinheiros',
    latitude: -23.5663,
    longitude: -46.693,
    priceLevel: 4,
    notes: 'Ideal para aniversário de namoro — reservar com antecedência.',
  }),
  seed(3, {
    name: 'Taqueria El Patio',
    status: 'wishlist',
    cuisine: 'Mexicana',
    neighborhood: 'Vila Madalena',
    priceLevel: 2,
    acceptsVr: true,
  }),
  seed(4, {
    name: 'Cantina da Nonna',
    status: 'visited',
    cuisine: 'Italiana',
    neighborhood: 'Bixiga',
    latitude: -23.559,
    longitude: -46.6458,
    priceLevel: 3,
    amountSpent: 186.5,
    acceptsVr: true,
    ratings: [
      { profileId: DEMO_ME, rating: 5 },
      { profileId: DEMO_PARTNER, rating: 5 },
    ],
    visitedAt: '2026-10-11',
    notes: 'O nhoque de domingo é imperdível. Porção serve dois.',
  }),
  seed(5, {
    name: 'Padaria Bella Vista',
    status: 'visited',
    category: 'padaria',
    cuisine: 'Café da manhã',
    neighborhood: 'Bela Vista',
    latitude: -23.564,
    longitude: -46.653,
    priceLevel: 1,
    amountSpent: 54,
    acceptsVr: true,
    ratings: [{ profileId: DEMO_PARTNER, rating: 4 }],
    visitedAt: '2026-09-28',
  }),
  seed(6, {
    name: 'Sushi Hana',
    status: 'visited',
    cuisine: 'Japonesa',
    neighborhood: 'Moema',
    latitude: -23.601,
    longitude: -46.664,
    priceLevel: 3,
    amountSpent: 240,
    ratings: [
      { profileId: DEMO_ME, rating: 4 },
      { profileId: DEMO_PARTNER, rating: 2 },
    ],
    visitedAt: '2026-09-14',
    notes: 'Bom, mas a fila foi muito longa. Talvez delivery.',
  }),
  seed(7, {
    name: 'Boteco da Esquina',
    status: 'wishlist',
    category: 'bar',
    neighborhood: 'Vila Madalena',
    latitude: -23.5568,
    longitude: -46.6896,
    priceLevel: 2,
    notes: 'Happy hour até as 20h. Pedir o bolinho de mandioca.',
  }),
  seed(8, {
    name: 'Doceria Açúcar Mascavo',
    status: 'visited',
    category: 'doceria',
    neighborhood: 'Perdizes',
    latitude: -23.5365,
    longitude: -46.6789,
    priceLevel: 2,
    amountSpent: 38,
    acceptsVr: true,
    ratings: [
      { profileId: DEMO_ME, rating: 5 },
      { profileId: DEMO_PARTNER, rating: 4 },
    ],
    visitedAt: '2026-10-04',
    notes: 'Bolo de pistache. Esgota cedo no sábado.',
  }),
];
