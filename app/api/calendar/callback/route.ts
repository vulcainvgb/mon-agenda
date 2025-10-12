import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/lib/googleCalendar';
import { createClient } from '@/lib/supabase-server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 CALLBACK - Début');
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.log('❌ Erreur OAuth:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/calendrier?error=${error}`
      );
    }

    if (!code || !state) {
      console.log('❌ Code ou state manquant');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/calendrier?error=missing_params`
      );
    }

    const { userId } = JSON.parse(state);
    console.log('👤 UserId du state:', userId);

    console.log('🔑 Échange du code contre les tokens...');
    const tokens = await googleCalendarService.getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Tokens invalides');
    }
    console.log('✅ Tokens obtenus');

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log('✅ Email Google:', userInfo.email);

    const supabase = await createClient();

    const expiresAt = new Date(
      Date.now() + (tokens.expiry_date ? tokens.expiry_date - Date.now() : 3600 * 1000)
    );

    console.log('💾 Tentative d\'enregistrement dans google_auth...');
    console.log('Données à insérer:', {
      user_id: userId,
      google_email: userInfo.email,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: expiresAt.toISOString()
    });

    const { data: insertedData, error: upsertError } = await supabase
      .from('google_auth')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        google_email: userInfo.email || null,
        calendar_id: 'primary',
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select(); // ← AJOUTEZ .select() pour voir les données insérées

    if (upsertError) {
      console.error('❌ Erreur upsert:', upsertError);
      throw upsertError;
    }
    
    console.log('✅ Données insérées:', insertedData);

    // Vérification : relire immédiatement pour confirmer
    const { data: verifyData, error: verifyError } = await supabase
      .from('google_auth')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('🔍 Vérification immédiate:', {
      found: !!verifyData,
      error: verifyError,
      data: verifyData
    });

    console.log('🔄 Lancement de la synchro initiale...');
    try {
      await googleCalendarService.syncCalendar(userId);
      console.log('✅ Synchro initiale terminée');
    } catch (syncError) {
      console.error('❌ Erreur synchro initiale:', syncError);
      // Ne pas bloquer le callback
    }

    console.log('↪️ Redirection vers /calendrier?connected=true');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendrier?connected=true`
    );
  } catch (error: any) {
    console.error('❌ Erreur callback OAuth:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendrier?error=${encodeURIComponent(error.message)}`
    );
  }
}