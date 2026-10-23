import { describe, expect, it } from 'vitest';
import { translateAuthError } from './auth/authApi';
import { normalizeInviteCode } from './couple/coupleApi';
import {
  buildSearchAttempts,
  parseAddress,
  rankResults,
  toPlaceResult,
  type PlaceResult,
} from './restaurants/data/geocoding';
import { toPlaceResultFromGoogle } from './restaurants/data/googlePlaces';
import { directionsUrl } from '@/shared/lib/maps';

const CORREIOS = 'Rua Pirapora, 218 - Vila Mariana, São Paulo - SP, 04008-060';

describe('parseAddress / buildSearchAttempts (formato dos Correios)', () => {
  it('separa rua, número e cidade, ignorando CEP e "- SP"', () => {
    expect(parseAddress(CORREIOS)).toEqual({
      original: CORREIOS,
      cleaned: 'Rua Pirapora, 218, Vila Mariana, São Paulo',
      street: 'Rua Pirapora',
      houseNumber: '218',
      city: 'São Paulo',
    });
    expect(parseAddress('Rua Pirapora 218, São Paulo')).toMatchObject({ street: 'Rua Pirapora', houseNumber: '218' });
  });

  it('com cidade, começa pela busca estruturada (rua e cidade separadas)', () => {
    expect(buildSearchAttempts(parseAddress(CORREIOS))).toEqual([
      { kind: 'structured', street: '218 Rua Pirapora', city: 'São Paulo' },
      { kind: 'structured', street: 'Rua Pirapora', city: 'São Paulo' },
      { kind: 'free', query: CORREIOS },
      { kind: 'free', query: 'Rua Pirapora, 218, Vila Mariana, São Paulo' },
    ]);
  });

  it('busca pelo nome do lugar continua sendo uma única tentativa', () => {
    expect(buildSearchAttempts(parseAddress('Ramen Kazoku'))).toEqual([{ kind: 'free', query: 'Ramen Kazoku' }]);
  });
});

describe('toPlaceResultFromGoogle', () => {
  const location = { lat: () => -23.5795, lng: () => -46.6433 };
  const components = [
    { longText: '218', types: ['street_number'] },
    { longText: 'Rua Pirapora', types: ['route'] },
    { longText: 'Vila Mariana', types: ['sublocality_level_1', 'sublocality', 'political'] },
    { longText: 'São Paulo', types: ['administrative_area_level_2', 'political'] },
  ];

  it('extrai bairro, cidade, número e place_id, e tira o ", Brasil" do endereço', () => {
    const place = toPlaceResultFromGoogle(
      {
        id: 'ChIJ123',
        formattedAddress: 'R. Pirapora, 218 - Vila Mariana, São Paulo - SP, 04008-060, Brasil',
        location,
        addressComponents: components,
      },
      'Z Deli Sandwich Shop',
    );

    expect(place).toEqual({
      label: 'Z Deli Sandwich Shop',
      address: 'R. Pirapora, 218 - Vila Mariana, São Paulo - SP, 04008-060',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      latitude: -23.5795,
      longitude: -46.6433,
      hasHouseNumber: true,
      googlePlaceId: 'ChIJ123',
    });
  });

  it('sem localização não serve para o mapa', () => {
    expect(toPlaceResultFromGoogle({ id: 'x', location: null }, 'X')).toBeNull();
  });
});

describe('directionsUrl', () => {
  it('com place_id abre o estabelecimento exato; sem ele, usa as coordenadas', () => {
    expect(directionsUrl(-23.5, -46.6, { name: 'Z Deli', googlePlaceId: 'ChIJ123' })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Z+Deli&destination_place_id=ChIJ123',
    );
    expect(directionsUrl(-23.5, -46.6)).toBe('https://www.google.com/maps/dir/?api=1&destination=-23.5,-46.6');
  });
});

describe('rankResults', () => {
  const place = (city: string, hasHouseNumber = false): PlaceResult => ({
    label: 'Rua Pirapora',
    address: `Rua Pirapora - ${city}`,
    neighborhood: null,
    city,
    latitude: 0,
    longitude: 0,
    hasHouseNumber,
  });

  it('com a cidade digitada, descarta ruas homônimas de outras cidades (o caso do print)', () => {
    const results = [place('São José dos Campos'), place('Catanduva'), place('Santo André'), place('São Paulo')];

    const ranked = rankResults(results, parseAddress(CORREIOS));

    expect(ranked.map(({ city }) => city)).toEqual(['São Paulo']);
    expect(ranked[0]?.approximate).toBe(true); // digitou 218, mas o resultado é só a rua
  });

  it('número encontrado não é aproximado; sem nenhum da cidade, mostra todos', () => {
    expect(rankResults([place('São Paulo', true)], parseAddress(CORREIOS))[0]?.approximate).toBe(false);
    expect(rankResults([place('Catanduva')], parseAddress(CORREIOS))).toHaveLength(1);
  });
});

describe('toPlaceResult (geocoding)', () => {
  it('monta endereço no padrão brasileiro e extrai o bairro', () => {
    const place = toPlaceResult({
      lat: '-23.5587',
      lon: '-46.6347',
      display_name: 'Kazoku, 50, Rua Galvão Bueno, Liberdade, São Paulo, Brasil',
      name: 'Kazoku',
      address: { road: 'Rua Galvão Bueno', house_number: '50', suburb: 'Liberdade', city: 'São Paulo' },
    });

    expect(place).toEqual({
      label: 'Kazoku',
      address: 'Rua Galvão Bueno, 50 - Liberdade - São Paulo',
      neighborhood: 'Liberdade',
      city: 'São Paulo',
      latitude: -23.5587,
      longitude: -46.6347,
      hasHouseNumber: true,
    });
  });

  it('sem detalhes de endereço, usa o texto completo como reserva', () => {
    const place = toPlaceResult({ lat: '1', lon: '2', display_name: 'Praça X, Centro' });

    expect(place.address).toBe('Praça X, Centro');
    expect(place.label).toBe('Praça X');
    expect(place.neighborhood).toBeNull();
  });
});

describe('normalizeInviteCode', () => {
  it('ignora espaços e símbolos, deixa maiúsculo e corta em 6', () => {
    expect(normalizeInviteCode(' a3f-9k2 ')).toBe('A3F9K2');
    expect(normalizeInviteCode('abcdefgh')).toBe('ABCDEF');
  });
});

describe('translateAuthError', () => {
  it('traduz os erros mais comuns do Supabase', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
    expect(translateAuthError('Password should be at least 6 characters.')).toBe(
      'A senha precisa ter pelo menos 6 caracteres.',
    );
    expect(translateAuthError('Erro desconhecido qualquer')).toBe('Erro desconhecido qualquer');
  });
});
