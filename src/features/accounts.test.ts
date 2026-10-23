import { describe, expect, it } from 'vitest';
import { translateAuthError } from './auth/authApi';
import { normalizeInviteCode } from './couple/coupleApi';
import { toPlaceResult } from './restaurants/data/geocoding';

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
      latitude: -23.5587,
      longitude: -46.6347,
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
