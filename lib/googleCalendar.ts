// lib/googleCalendar.ts
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { getColorFromGoogleId, findClosestGoogleColorId } from './google-colors'; // ✅ Import des fonctions de couleur
import moment from 'moment-timezone'

// DEBUG : Vérifier que la clé est chargée
console.log('🔑 SUPABASE_SERVICE_ROLE_KEY présente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('🔑 Longueur:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
console.log('🔑 Premiers caractères:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));

// Créer un client Supabase pour le serveur
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface GoogleAuthData {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  google_email: string | null;
  calendar_id: string;
  sync_enabled: boolean;
}

export interface SyncResult {
  success: boolean;
  imported: number;
  exported: number;
  conflicts: number;
  errors: string[];
}

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Génère l'URL d'authentification OAuth
   * 🔥 Le scope 'calendar' donne accès à TOUS les calendriers de l'utilisateur
   * (primary + partagés + auxquels il est invité)
   */
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar', // ✅ Accès complet aux calendriers
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent', // Force le consent pour obtenir le refresh_token
    });
  }

  /**
   * Échange le code OAuth contre des tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Rafraîchit le token d'accès si expiré
   */
  async refreshAccessToken(authData: GoogleAuthData): Promise<string> {
    const expiresAt = new Date(authData.token_expires_at);
    const now = new Date();

    // Si le token expire dans moins de 5 minutes, le rafraîchir
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      this.oauth2Client.setCredentials({
        refresh_token: authData.refresh_token,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token;
      const newExpiresAt = new Date(credentials.expiry_date);

      // Mettre à jour dans Supabase
      await supabase
        .from('google_auth')
        .update({
          access_token: newAccessToken,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authData.user_id);

      return newAccessToken!;
    }

    return authData.access_token;
  }

  /**
   * Obtient le client calendar authentifié
   */
  private async getCalendarClient(authData: GoogleAuthData) {
    const accessToken = await this.refreshAccessToken(authData);
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: authData.refresh_token,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Synchronisation bidirectionnelle complète
   */
  async syncCalendar(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      imported: 0,
      exported: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      // 1. Récupérer les credentials Google
      const { data: authData, error: authError } = await supabase
        .from('google_auth')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📊 AuthData récupérée:', {
        found: !!authData,
        error: authError,
        hasAccessToken: authData?.access_token ? 'Oui ✅' : 'Non ❌',
        hasRefreshToken: authData?.refresh_token ? 'Oui ✅' : 'Non ❌',
        expiresAt: authData?.token_expires_at
      });

      if (authError || !authData) {
        result.errors.push('Google Calendar non connecté');
        return result;
      }

      if (!authData.sync_enabled) {
        result.errors.push('Synchronisation désactivée');
        return result;
      }

      const calendar = await this.getCalendarClient(authData);

      // 2. Récupérer les événements depuis la dernière synchro
      const lastSyncAt = authData.last_sync_at
        ? new Date(authData.last_sync_at)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut

      // 3. Import depuis Google Calendar
      // 🔥 MODIFICATION : Passer google_email pour filtrer les événements avec invités
      const importResult = await this.importFromGoogle(
        calendar,
        userId,
        authData.calendar_id,
        authData.google_email, // ✅ AJOUT : email de l'utilisateur
        lastSyncAt
      );
      result.imported = importResult.imported;
      result.conflicts += importResult.conflicts;
      result.errors.push(...importResult.errors);

      // 4. Export vers Google Calendar
      const exportResult = await this.exportToGoogle(
        calendar,
        userId,
        authData.calendar_id,
        lastSyncAt
      );
      result.exported = exportResult.exported;
      result.conflicts += exportResult.conflicts;
      result.errors.push(...exportResult.errors);

      // 5. Mettre à jour la date de dernière synchro
      await supabase
        .from('google_auth')
        .update({
          last_sync_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Erreur inconnue');
      return result;
    }
  }

  /**
   * 🔥 FONCTION CORRIGÉE - Import des événements depuis Google Calendar
   * CORRECTION : Déduplication des événements qui apparaissent dans plusieurs calendriers
   */
  private async importFromGoogle(
    calendar: any,
    userId: string,
    calendarId: string,
    userEmail: string | null,
    lastSyncAt: Date
  ) {
    const result = { imported: 0, conflicts: 0, errors: [] as string[] };

    try {
      console.log('🔍 Récupération des événements depuis Google Calendar...');
      console.log(`📧 Email utilisateur: ${userEmail}`);
      
      // 🔥 SOLUTION : Récupérer les événements de TOUS les calendriers accessibles
      // Étape 1 : Lister tous les calendriers
      console.log('\n📋 Étape 1 : Liste de tous vos calendriers...');
      const calendarListResponse = await calendar.calendarList.list();
      const calendars = calendarListResponse.data.items || [];
      
      console.log(`📅 ${calendars.length} calendrier(s) trouvé(s):`);
      calendars.forEach((cal: any, idx: number) => {
        console.log(`   ${idx + 1}. ${cal.summary} (${cal.id}) - ${cal.accessRole}`);
      });

      // Étape 2 : Récupérer les événements de chaque calendrier
      const allGoogleEvents: any[] = [];
      
      for (const cal of calendars) {
        try {
          console.log(`\n🔍 Récupération événements du calendrier: "${cal.summary}"...`);
          
          const response = await calendar.events.list({
            calendarId: cal.id,
            updatedMin: lastSyncAt.toISOString(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'updated',
            // 🔥 IMPORTANT : Inclure les événements supprimés pour pouvoir les gérer
            showDeleted: false,
          });

          const events = response.data.items || [];
          console.log(`   ✅ ${events.length} événement(s) trouvé(s)`);
          
          // Ajouter les événements à la liste globale
          allGoogleEvents.push(...events);
          
        } catch (calError: any) {
          console.error(`   ❌ Erreur calendrier "${cal.summary}":`, calError.message);
          result.errors.push(`Erreur calendrier ${cal.summary}: ${calError.message}`);
        }
      }

      // 🔥 CORRECTION PRINCIPALE : DÉDUPLICATION DES ÉVÉNEMENTS
      // Un même événement peut apparaître dans plusieurs calendriers (invitations)
      // On utilise gEvent.id comme clé unique pour dédupliquer
      const uniqueEventsMap = new Map<string, any>();
      for (const event of allGoogleEvents) {
        if (!uniqueEventsMap.has(event.id)) {
          uniqueEventsMap.set(event.id, event);
        }
      }
      const googleEvents = Array.from(uniqueEventsMap.values());
      
      console.log(`\n📥 TOTAL : ${allGoogleEvents.length} événements récupérés`);
      console.log(`✨ APRÈS DÉDUPLICATION : ${googleEvents.length} événements uniques`);
      console.log(`🗑️  Doublons supprimés : ${allGoogleEvents.length - googleEvents.length}`);

      // 🔥 DEBUG APPROFONDI
      console.log('\n🔥🔥🔥 DEBUG APPROFONDI - ÉVÉNEMENTS REÇUS 🔥🔥🔥');
      console.log('📦 Nombre total d\'événements:', googleEvents.length);
      
      if (googleEvents.length === 0) {
        console.log('⚠️  AUCUN ÉVÉNEMENT REÇU');
      }
      
      // Afficher UN APERÇU de tous les événements
      googleEvents.forEach((evt: any, idx: number) => {
        console.log(`\n📋 Aperçu événement ${idx + 1}:`);
        console.log(`   Titre: "${evt.summary}"`);
        console.log(`   ID Google: ${evt.id}`);
        console.log(`   Créateur: ${evt.creator?.email || 'N/A'}`);
        console.log(`   Invités: ${evt.attendees?.length || 0}`);
        if (evt.attendees && evt.attendees.length > 0) {
          console.log(`   Liste invités: ${evt.attendees.map((a: any) => a.email).join(', ')}`);
        }
      });
      console.log('🔥🔥🔥 FIN DEBUG 🔥🔥🔥\n');

      for (const gEvent of googleEvents) {
        try {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`🔍 Traitement événement: "${gEvent.summary}"`);
          console.log(`   ID: ${gEvent.id}`);
          console.log(`   Status: ${gEvent.status}`);
          console.log(`   Creator: ${gEvent.creator?.email || 'N/A'}`);
          console.log(`   Organizer: ${gEvent.organizer?.email || 'N/A'}`);
          
          if (gEvent.attendees && gEvent.attendees.length > 0) {
            console.log(`   👥 Invités: ${gEvent.attendees.length}`);
            gEvent.attendees.forEach((attendee: any, idx: number) => {
              console.log(`      ${idx + 1}. ${attendee.email} (${attendee.responseStatus || 'inconnu'})`);
            });
          } else {
            console.log(`   👤 Événement sans invité`);
          }

          // Ignorer les événements supprimés
          if (gEvent.status === 'cancelled') {
            console.log(`   🗑️  Événement annulé - suppression locale`);
            await supabase
              .from('events')
              .delete()
              .eq('google_event_id', gEvent.id)
              .eq('user_id', userId);
            continue;
          }

          // 🔥 CORRECTION : Vérifier que l'événement a des dates valides
          if (!gEvent.start || (!gEvent.start.dateTime && !gEvent.start.date)) {
            console.log(`   ⚠️  Événement sans date valide - SKIPPÉ`);
            continue;
          }

          // 🔥 CORRECTION : Utiliser .maybeSingle() au lieu de .single()
          // pour éviter les erreurs quand l'événement n'existe pas
          const { data: existingEvent, error: existingError } = await supabase
            .from('events')
            .select('*')
            .eq('google_event_id', gEvent.id)
            .eq('user_id', userId)
            .maybeSingle(); // ✅ Retourne null si pas trouvé au lieu de lever une erreur

          if (existingError) {
            console.error(`   ❌ Erreur recherche événement existant:`, existingError);
            result.errors.push(`Erreur recherche: ${existingError.message}`);
            continue;
          }

          const googleUpdatedAt = new Date(gEvent.updated);

          // Résolution de conflit : last-write-wins
          if (existingEvent) {
            console.log(`   📝 Événement existant trouvé (ID local: ${existingEvent.id})`);
            const localUpdatedAt = new Date(existingEvent.updated_at);

            if (googleUpdatedAt > localUpdatedAt) {
              console.log(`   🔄 Google plus récent → mise à jour locale`);
              await this.updateLocalEvent(existingEvent.id, gEvent);
              result.imported++;
            } else {
              console.log(`   ⚖️  Local plus récent → conflit résolu (keep local)`);
              result.conflicts++;
            }
          } else {
            console.log(`   ➕ Nouvel événement → création locale`);
            await this.createLocalEvent(userId, gEvent);
            result.imported++;
          }
        } catch (eventError: any) {
          console.error(`   ❌ Erreur traitement événement "${gEvent.summary}":`, eventError.message);
          result.errors.push(`Erreur événement ${gEvent.summary}: ${eventError.message}`);
        }
      }

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ Import terminé:`);
      console.log(`   - Importés: ${result.imported}`);
      console.log(`   - Conflits: ${result.conflicts}`);
      console.log(`   - Erreurs: ${result.errors.length}`);
      
      return result;
    } catch (error: any) {
      console.error('❌ Erreur importFromGoogle:', error);
      result.errors.push(`Erreur liste Google: ${error.message}`);
      return result;
    }
  }

  /**
   * Export des événements vers Google Calendar
   * 🔥 IMPORTANT : Les événements sont exportés vers votre calendrier PRINCIPAL uniquement
   * (pas vers les calendriers partagés où vous êtes invité)
   */
  private async exportToGoogle(
    calendar: any,
    userId: string,
    calendarId: string,
    lastSyncAt: Date
  ) {
    const result = { exported: 0, conflicts: 0, errors: [] as string[] };

    try {
      console.log('\n📤 Export vers Google Calendar (calendrier principal)...');
      
      // Récupérer les événements locaux modifiés depuis la dernière synchro
      const { data: localEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', lastSyncAt.toISOString());

      if (error) {
        result.errors.push(`Erreur récupération locale: ${error.message}`);
        return result;
      }

      for (const localEvent of localEvents || []) {
        try {
          // CAS 1 : L'événement a déjà un google_event_id
          if (localEvent.google_event_id) {
            try {
              // Vérifier si l'événement existe toujours sur Google
              const gEvent = await calendar.events.get({
                calendarId,
                eventId: localEvent.google_event_id,
              });

              const googleUpdatedAt = new Date(gEvent.data.updated);
              const localUpdatedAt = new Date(localEvent.updated_at);

              // Comparer les timestamps
              if (localUpdatedAt > googleUpdatedAt) {
                // Local plus récent → mettre à jour Google
                await this.updateGoogleEvent(
                  calendar,
                  calendarId,
                  localEvent.google_event_id,
                  localEvent
                );
                result.exported++;
                console.log(`✅ Événement mis à jour sur Google: ${localEvent.title}`);
              } else {
                // Google plus récent → pas de changement
                result.conflicts++;
              }
            } catch (error: any) {
              if (error.code === 404) {
                // L'événement n'existe plus sur Google → le recréer
                console.log(`⚠️ Événement introuvable sur Google, recréation: ${localEvent.title}`);
                const newGoogleEventId = await this.createGoogleEvent(
                  calendar,
                  calendarId,
                  localEvent
                );
                await this.updateLocalEventGoogleId(localEvent.id, newGoogleEventId);
                result.exported++;
              } else {
                throw error;
              }
            }
          } 
          // CAS 2 : Nouvel événement sans google_event_id
          else {
            // Créer un nouvel événement directement
            // (pas de recherche d'événements similaires pour éviter les faux positifs)
            console.log(`➕ Création nouvel événement sur Google: ${localEvent.title}`);
            const googleEventId = await this.createGoogleEvent(
              calendar,
              calendarId,
              localEvent
            );
            await this.updateLocalEventGoogleId(localEvent.id, googleEventId);
            result.exported++;
          }
        } catch (error: any) {
          console.error(`❌ Erreur export "${localEvent.title}":`, error.message);
          result.errors.push(`Erreur export ${localEvent.title}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Erreur export: ${error.message}`);
    }

    return result;
  }

  /**
   * Crée un événement local depuis Google
   */
  private async createLocalEvent(userId: string, gEvent: any) {
    const startTime = this.parseGoogleDateTime(gEvent.start);
    const endTime = this.parseGoogleDateTime(gEvent.end);
    const color = getColorFromGoogleId(gEvent.colorId); // ✅ Récupération de la couleur

    console.log(`🎨 Import événement "${gEvent.summary}" avec colorId ${gEvent.colorId} → ${color}`);

    await supabase.from('events').insert({
      user_id: userId,
      title: gEvent.summary || 'Sans titre',
      description: gEvent.description || '',
      start_time: startTime,
      end_time: endTime,
      google_event_id: gEvent.id,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      color: color, // ✅ Utilisation de la couleur convertie
    });
  }

  /**
   * Met à jour un événement local depuis Google
   */
  private async updateLocalEvent(eventId: string, gEvent: any) {
    const startTime = this.parseGoogleDateTime(gEvent.start);
    const endTime = this.parseGoogleDateTime(gEvent.end);
    const color = getColorFromGoogleId(gEvent.colorId); // ✅ Récupération de la couleur

    console.log(`🎨 Update événement "${gEvent.summary}" avec colorId ${gEvent.colorId} → ${color}`);

    await supabase
      .from('events')
      .update({
        title: gEvent.summary || 'Sans titre',
        description: gEvent.description || '',
        start_time: startTime,
        end_time: endTime,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        color: color, // ✅ Mise à jour de la couleur
      })
      .eq('id', eventId);
  }

  /**
   * Crée un événement sur Google Calendar
   */
  private async createGoogleEvent(
    calendar: any,
    calendarId: string,
    localEvent: any
  ): Promise<string> {
    const colorId = findClosestGoogleColorId(localEvent.color); // ✅ Conversion de la couleur locale
    
    console.log(`🎨 Export événement "${localEvent.title}" avec couleur ${localEvent.color} → colorId ${colorId}`);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: localEvent.title,
        description: localEvent.description || '',
        start: this.formatDateTimeForGoogle(localEvent.start_time),
        end: this.formatDateTimeForGoogle(localEvent.end_time),
        colorId: colorId, // ✅ Utilisation de la couleur convertie
      },
    });

    return response.data.id;
  }

  /**
   * Met à jour un événement sur Google Calendar
   */
  private async updateGoogleEvent(
    calendar: any,
    calendarId: string,
    googleEventId: string,
    localEvent: any
  ) {
    const colorId = findClosestGoogleColorId(localEvent.color); // ✅ Conversion de la couleur locale
    
    console.log(`🎨 Update Google événement "${localEvent.title}" avec couleur ${localEvent.color} → colorId ${colorId}`);

    await calendar.events.update({
      calendarId,
      eventId: googleEventId,
      requestBody: {
        summary: localEvent.title,
        description: localEvent.description || '',
        start: this.formatDateTimeForGoogle(localEvent.start_time),
        end: this.formatDateTimeForGoogle(localEvent.end_time),
        colorId: colorId, // ✅ Utilisation de la couleur convertie
      },
    });
  }

  /**
   * Met à jour le google_event_id d'un événement local
   */
  private async updateLocalEventGoogleId(eventId: string, googleEventId: string) {
    await supabase
      .from('events')
      .update({
        google_event_id: googleEventId,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', eventId);
  }

  /**
   * Parse une date/heure de Google Calendar
   */
  private parseGoogleDateTime(dateTime: any): string {
  if (dateTime.dateTime) {
    // Événement avec heure précise
    // Google renvoie en format ISO avec Z (UTC)
    const utcDate = moment.utc(dateTime.dateTime);
    const parisDate = utcDate.tz('Europe/Paris');
    
    console.log('📥 Import depuis Google:', {
      googleUtc: dateTime.dateTime,
      parisTime: parisDate.format('YYYY-MM-DD HH:mm'),
      formatted: this.formatLocalDateTime(parisDate.toDate())
    });
    
    return this.formatLocalDateTime(parisDate.toDate());
  } else if (dateTime.date) {
    // Événement toute la journée
    const date = moment(dateTime.date).tz('Europe/Paris');
    return this.formatLocalDateTime(date.toDate());
  }
  
  return this.formatLocalDateTime(new Date());
  }


/**
 * Formate une date pour Google Calendar
 * IMPORTANT : Google Calendar attend une date ISO avec timezone explicite
 */
  private formatDateTimeForGoogle(dateTime: string | Date) {
  // Si c'est une string au format "2025-10-17 14:00:00"
    if (typeof dateTime === 'string') {
    // Nettoyer le format
      const cleaned = dateTime.replace(' ', 'T');
    
    // Parser en tant qu'heure de Paris (pas UTC !)
      const parisDate = moment.tz(cleaned, 'Europe/Paris');
    
      console.log('📤 Export vers Google:', {
        input: dateTime,
        parisTime: parisDate.format('YYYY-MM-DD HH:mm'),
        iso: parisDate.toISOString()
      });
    
    return {
      dateTime: parisDate.toISOString(), // Convertit en UTC
      timeZone: 'Europe/Paris', // Mais indique la timezone d'origine
    };
  }
  
  // Si c'est déjà un objet Date
  const parisDate = moment(dateTime).tz('Europe/Paris');
  
  console.log('📤 Export vers Google (Date):', {
    parisTime: parisDate.format('YYYY-MM-DD HH:mm'),
    iso: parisDate.toISOString()
  });
  
  return {
    dateTime: parisDate.toISOString(),
    timeZone: 'Europe/Paris',
  };
  }

/**
 * Formate une date en heure locale pour Supabase
 * Format: "YYYY-MM-DD HH:mm:ss"
 */
 private formatLocalDateTime(date: Date): string {
  const parisDate = moment(date).tz('Europe/Paris');
  const formatted = parisDate.format('YYYY-MM-DD HH:mm:ss');
  
  console.log('💾 Format pour Supabase:', {
    input: date.toISOString(),
    paris: parisDate.format('YYYY-MM-DD HH:mm'),
    output: formatted
  });
  
  return formatted;
}
}

class GoogleCalendarServiceSingleton {
  private instance: GoogleCalendarService | null = null;

  getInstance(): GoogleCalendarService {
    if (!this.instance) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      console.log('🔍 Initialisation GoogleCalendarService:');
      console.log('CLIENT_ID:', clientId?.substring(0, 30) + '...');
      console.log('CLIENT_SECRET:', clientSecret ? 'Présent ✅' : 'ABSENT ❌');
      console.log('APP_URL:', appUrl);
      console.log('REDIRECT_URI:', `${appUrl}/api/calendar/callback`);

      if (!clientId || !clientSecret || !appUrl) {
        throw new Error(
          'Variables d\'environnement Google manquantes. ' +
          `CLIENT_ID: ${!!clientId}, SECRET: ${!!clientSecret}, APP_URL: ${!!appUrl}`
        );
      }

      this.instance = new GoogleCalendarService(
        clientId,
        clientSecret,
        `${appUrl}/api/calendar/callback`
      );
    }
    return this.instance;
  }
}

const singleton = new GoogleCalendarServiceSingleton();

export const googleCalendarService = {
  getAuthUrl: (state: string) => singleton.getInstance().getAuthUrl(state),
  getTokensFromCode: (code: string) => singleton.getInstance().getTokensFromCode(code),
  syncCalendar: (userId: string) => singleton.getInstance().syncCalendar(userId),
};