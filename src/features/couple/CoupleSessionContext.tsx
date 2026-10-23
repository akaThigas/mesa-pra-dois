import { createContext, useContext, type ReactNode } from 'react';
import type { CoupleMember, CoupleSession } from '@/features/restaurants/types';

/**
 * Quem está logado e quem é o par é informação "global" da árvore:
 * Context evita passar essas props por 4 níveis (prop drilling).
 */
const CoupleSessionContext = createContext<CoupleSession | null>(null);

export function CoupleSessionProvider({ session, children }: { session: CoupleSession; children: ReactNode }) {
  return <CoupleSessionContext value={session}>{children}</CoupleSessionContext>;
}

export function useCoupleSession(): CoupleSession {
  const session = useContext(CoupleSessionContext);
  if (!session) throw new Error('useCoupleSession precisa estar dentro de <CoupleSessionProvider>');
  return session;
}

/** Membros com quem está logado primeiro, já com o rótulo de exibição. */
export function membersForDisplay({ members, currentUserId }: CoupleSession): (CoupleMember & { isMe: boolean })[] {
  return members
    .map((member) => ({
      ...member,
      isMe: member.id === currentUserId,
      displayName: member.id === currentUserId ? 'Você' : member.displayName,
    }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe));
}
