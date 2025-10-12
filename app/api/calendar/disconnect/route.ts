import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('google_auth')
      .delete()
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    await supabase
      .from('events')
      .update({
        google_event_id: null,
        sync_status: 'pending',
        last_synced_at: null
      })
      .eq('user_id', session.user.id)
      .not('google_event_id', 'is', null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur déconnexion:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}