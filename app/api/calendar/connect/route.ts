import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/lib/googleCalendar';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 /api/calendar/connect - Début');
    
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('🔐 Session:', {
      hasSession: !!session,
      userId: session?.user?.id
    });
    
    if (!session) {
      console.log('❌ Pas de session');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const state = JSON.stringify({ userId: session.user.id });
    console.log('🔑 Génération URL Google...');
    const authUrl = googleCalendarService.getAuthUrl(state);
    
    console.log('✅ URL générée:', authUrl.substring(0, 100) + '...');

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('❌ Erreur génération URL auth:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}