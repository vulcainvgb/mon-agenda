import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { data: authData } = await supabase
      .from('google_auth')
      .select('google_email, calendar_id, last_sync_at, sync_enabled')
      .eq('user_id', session.user.id)
      .single();

    if (!authData) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: authData.google_email,
      calendarId: authData.calendar_id,
      lastSync: authData.last_sync_at,
      syncEnabled: authData.sync_enabled
    });
  } catch (error: any) {
    console.error('Erreur status:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}