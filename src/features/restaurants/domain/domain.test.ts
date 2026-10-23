import { describe, expect, it } from 'vitest';
import { parseMoney } from '@/shared/lib/format';
import { googleSearchUrl } from '@/shared/lib/links';
import { searchQueryFor } from './search';
import type { Restaurant } from '../types';
import { applyRestaurantChange } from './applyRestaurantChange';
import { DEFAULT_FILTERS, countByCategory, countByStatus, filterRestaurants, hasActiveFilters } from './filters';
import { averageRating, ratingOf, setMemberRating } from './ratings';

/** Factory de teste: só declara o que importa em cada caso. */
function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: crypto.randomUUID(),
    coupleId: 'casal-1',
    name: 'Restaurante',
    status: 'wishlist',
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
    createdBy: null,
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
    ...overrides,
  };
}

const withoutRatings = ({ ratings: _ratings, ...fields }: Restaurant) => fields;

describe('filterRestaurants', () => {
  it('mostra só a lista (aba) selecionada', () => {
    const wish = makeRestaurant({ status: 'wishlist' });
    const visited = makeRestaurant({ status: 'visited' });

    expect(filterRestaurants([wish, visited], DEFAULT_FILTERS)).toEqual([wish]);
  });

  it('busca ignora acentos e maiúsculas, inclusive em bairro e observações', () => {
    const cafe = makeRestaurant({ name: 'Café São Bento' });
    const ramen = makeRestaurant({ name: 'Kazoku', notes: 'Pedir o ramen tonkotsu' });
    const other = makeRestaurant({ name: 'Cantina' });

    expect(filterRestaurants([cafe, ramen, other], { ...DEFAULT_FILTERS, search: 'cafe sao' })).toEqual([cafe]);
    expect(filterRestaurants([cafe, ramen, other], { ...DEFAULT_FILTERS, search: 'RAMEN' })).toEqual([ramen]);
  });

  it('combina filtros de VR e faixa de preço', () => {
    const cheapVr = makeRestaurant({ priceLevel: 1, acceptsVr: true });
    const cheapNoVr = makeRestaurant({ priceLevel: 1, acceptsVr: false });
    const expensiveVr = makeRestaurant({ priceLevel: 4, acceptsVr: true });

    const result = filterRestaurants([cheapVr, cheapNoVr, expensiveVr], {
      ...DEFAULT_FILTERS,
      onlyAcceptsVr: true,
      priceLevels: [1, 2],
    });

    expect(result).toEqual([cheapVr]);
  });

  it('ordena pela MÉDIA do casal e desempata pelo nome', () => {
    const b = makeRestaurant({ status: 'visited', name: 'B', ratings: [{ profileId: 'eu', rating: 5 }] });
    const a = makeRestaurant({
      status: 'visited',
      name: 'A',
      ratings: [
        { profileId: 'eu', rating: 5 },
        { profileId: 'par', rating: 5 },
      ],
    });
    const c = makeRestaurant({
      status: 'visited',
      name: 'C',
      ratings: [
        { profileId: 'eu', rating: 5 },
        { profileId: 'par', rating: 1 },
      ],
    });

    const result = filterRestaurants([c, b, a], { ...DEFAULT_FILTERS, status: 'visited', sortBy: 'rating' });

    expect(result.map(({ name }) => name)).toEqual(['A', 'B', 'C']);
  });

  it('"4+" usa a média: 5 e 2 (média 3,5) fica de fora', () => {
    const divided = makeRestaurant({
      status: 'visited',
      ratings: [
        { profileId: 'eu', rating: 5 },
        { profileId: 'par', rating: 2 },
      ],
    });
    const loved = makeRestaurant({ status: 'visited', ratings: [{ profileId: 'eu', rating: 4 }] });

    const result = filterRestaurants([divided, loved], { ...DEFAULT_FILTERS, status: 'visited', minRating: 4 });

    expect(result).toEqual([loved]);
  });

  it('não altera o array original', () => {
    const list = [makeRestaurant({ name: 'Z' }), makeRestaurant({ name: 'A' })];
    const snapshot = [...list];

    filterRestaurants(list, { ...DEFAULT_FILTERS, sortBy: 'name' });

    expect(list).toEqual(snapshot);
  });
});

describe('categorias', () => {
  it('filtra por categoria e combina com a lista (aba) atual', () => {
    const bar = makeRestaurant({ category: 'bar' });
    const visitedBar = makeRestaurant({ category: 'bar', status: 'visited' });
    const bakery = makeRestaurant({ category: 'padaria' });

    expect(filterRestaurants([bar, visitedBar, bakery], { ...DEFAULT_FILTERS, category: 'bar' })).toEqual([bar]);
    expect(filterRestaurants([bar, visitedBar, bakery], { ...DEFAULT_FILTERS, category: null })).toHaveLength(2);
  });

  it('conta por categoria só dentro da lista atual', () => {
    const list = [
      makeRestaurant({ category: 'bar' }),
      makeRestaurant({ category: 'bar' }),
      makeRestaurant({ category: 'cafe', status: 'visited' }),
    ];

    expect(countByCategory(list, 'wishlist')).toEqual({ bar: 2 });
    expect(countByCategory(list, 'visited')).toEqual({ cafe: 1 });
  });

  it('a busca encontra pelo tipo, no singular ou plural e sem acento', () => {
    const bar = makeRestaurant({ name: 'Boteco do Zé', category: 'bar' });
    const cafe = makeRestaurant({ name: 'Grão Torrado', category: 'cafe' });
    const restaurant = makeRestaurant({ name: 'Cantina', category: 'restaurante' });
    const list = [bar, cafe, restaurant];

    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, search: 'bar' })).toEqual([bar]);
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, search: 'Bares' })).toEqual([bar]);
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, search: 'cafe' })).toEqual([cafe]);
  });

  it('categoria escolhida conta como filtro ativo', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, category: 'doceria' })).toBe(true);
  });
});

describe('countByStatus / hasActiveFilters', () => {
  it('conta itens por lista', () => {
    const list = [makeRestaurant(), makeRestaurant(), makeRestaurant({ status: 'visited' })];
    expect(countByStatus(list)).toEqual({ wishlist: 2, visited: 1 });
  });

  it('aba e ordenação não contam como filtro ativo', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'visited', sortBy: 'name' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, onlyAcceptsVr: true })).toBe(true);
  });
});

describe('notas individuais', () => {
  it('calcula média e encontra a nota de cada pessoa', () => {
    const r = makeRestaurant({
      ratings: [
        { profileId: 'eu', rating: 5 },
        { profileId: 'par', rating: 2 },
      ],
    });

    expect(averageRating(r)).toBe(3.5);
    expect(averageRating(makeRestaurant())).toBeNull();
    expect(ratingOf(r, 'par')).toBe(2);
    expect(ratingOf(r, 'outra-pessoa')).toBeNull();
  });

  it('setMemberRating troca a nota sem mexer na do outro, e null remove', () => {
    const ratings = [
      { profileId: 'eu', rating: 3 as const },
      { profileId: 'par', rating: 4 as const },
    ];

    expect(setMemberRating(ratings, 'eu', 5)).toEqual([
      { profileId: 'par', rating: 4 },
      { profileId: 'eu', rating: 5 },
    ]);
    expect(setMemberRating(ratings, 'eu', null)).toEqual([{ profileId: 'par', rating: 4 }]);
  });
});

describe('applyRestaurantChange', () => {
  it('insere novos no topo e atualiza existentes sem duplicar (idempotente)', () => {
    const existing = makeRestaurant({ name: 'Antigo' });
    const created = makeRestaurant({ name: 'Novo' });
    const event = { type: 'upsert' as const, restaurant: withoutRatings(created) };

    const afterEcho = applyRestaurantChange(applyRestaurantChange([existing], event), event);

    expect(afterEcho.map(({ name }) => name)).toEqual(['Novo', 'Antigo']);
  });

  it('atualizar o restaurante preserva as notas que já estavam na lista', () => {
    const rated = makeRestaurant({ status: 'visited', ratings: [{ profileId: 'par', rating: 4 }] });

    const [result] = applyRestaurantChange([rated], {
      type: 'upsert',
      restaurant: { ...withoutRatings(rated), notes: 'Voltar no inverno' },
    });

    expect(result?.notes).toBe('Voltar no inverno');
    expect(result?.ratings).toEqual([{ profileId: 'par', rating: 4 }]);
  });

  it('evento de nota altera só a pessoa e o restaurante certos', () => {
    const target = makeRestaurant({ status: 'visited' });
    const other = makeRestaurant({ status: 'visited' });

    const result = applyRestaurantChange([target, other], {
      type: 'rating',
      restaurantId: target.id,
      profileId: 'par',
      rating: 5,
    });

    expect(result[0]?.ratings).toEqual([{ profileId: 'par', rating: 5 }]);
    expect(result[1]?.ratings).toEqual([]);
  });

  it('remove por id e ignora ids desconhecidos', () => {
    const r = makeRestaurant();

    expect(applyRestaurantChange([r], { type: 'delete', id: r.id })).toEqual([]);
    expect(applyRestaurantChange([r], { type: 'delete', id: 'outro' })).toEqual([r]);
  });
});

describe('busca no Google', () => {
  it('usa nome + bairro e codifica acentos e símbolos', () => {
    const query = searchQueryFor({ name: 'Bistrô & Cia', neighborhood: 'Pinheiros' });

    expect(query).toBe('Bistrô & Cia Pinheiros');
    expect(googleSearchUrl(query)).toBe('https://www.google.com/search?q=Bistr%C3%B4%20%26%20Cia%20Pinheiros');
  });

  it('sem bairro, pesquisa só o nome', () => {
    expect(searchQueryFor({ name: 'Ramen Kazoku', neighborhood: null })).toBe('Ramen Kazoku');
  });
});

describe('parseMoney', () => {
  it('entende o formato brasileiro', () => {
    expect(parseMoney('186,50')).toBe(186.5);
    expect(parseMoney('R$ 1.234,5')).toBe(1234.5);
    expect(parseMoney('54')).toBe(54);
    expect(parseMoney('  ')).toBeNull();
    expect(parseMoney('abc')).toBeNaN();
  });
});
