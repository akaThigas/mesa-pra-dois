import type { CoupleSession } from '@/features/restaurants/types';
import { getSupabaseClient } from '@/shared/lib/supabase';

interface ProfileRow {
  id: string;
  display_name: string;
  couple_id: string | null;
}

export type CoupleLoadResult =
  | { kind: 'no-couple'; displayName: string }
  | { kind: 'ready'; session: CoupleSession };

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/**
 * Monta a CoupleSession de quem está logado:
 * perfil → casal (código de convite) → membros.
 * O RLS garante que só voltam dados do próprio casal.
 */
export async function loadCoupleSession(userId: string): Promise<CoupleLoadResult> {
  const supabase = getSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, couple_id')
    .eq('id', userId)
    .single<ProfileRow>();
  throwIfError(profileError);
  if (!profile) throw new Error('Perfil não encontrado');

  if (!profile.couple_id) return { kind: 'no-couple', displayName: profile.display_name };

  const [coupleResult, membersResult] = await Promise.all([
    supabase.from('couples').select('invite_code').eq('id', profile.couple_id).single<{ invite_code: string }>(),
    supabase.from('profiles').select('id, display_name, couple_id').eq('couple_id', profile.couple_id),
  ]);
  throwIfError(coupleResult.error);
  throwIfError(membersResult.error);

  return {
    kind: 'ready',
    session: {
      coupleId: profile.couple_id,
      currentUserId: userId,
      inviteCode: coupleResult.data?.invite_code ?? null,
      members: ((membersResult.data ?? []) as ProfileRow[]).map((member) => ({
        id: member.id,
        displayName: member.display_name,
      })),
    },
  };
}

/** RPCs da migração 001: as regras (limite de 2, código válido) ficam no banco. */
export async function createCouple(): Promise<void> {
  const { error } = await getSupabaseClient().rpc('create_couple');
  throwIfError(error);
}

export async function joinCouple(code: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('join_couple', { code });
  throwIfError(error);
}

/** "a3f 9k2" → "A3F9K2" */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
}
