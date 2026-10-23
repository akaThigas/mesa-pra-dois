import type { Restaurant } from '../types';

/**
 * O que pesquisar no Google: nome + bairro, quando houver.
 * O bairro desambigua nomes comuns ("Padaria Bella Vista" existe em várias cidades).
 */
export function searchQueryFor({ name, neighborhood }: Pick<Restaurant, 'name' | 'neighborhood'>): string {
  return [name, neighborhood].filter(Boolean).join(' ');
}
