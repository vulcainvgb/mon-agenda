import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/lib/googleCalendar';
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

    const result = await googleCalendarService.syncCalendar(session.user.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erreur synchronisation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        imported: 0,
        exported: 0,
        conflicts: 0,
        errors: [error.message]
      },
      { status: 500 }
    );
  }
}