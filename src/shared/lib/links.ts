/** Link de busca do Google. encodeURIComponent trata acentos, espaços e "&". */
export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
