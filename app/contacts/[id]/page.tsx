'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Contact, ContactGroup } from '../../../lib/types';
import NotesTimeline from '../../../components/NotesTimeline';
import Link from 'next/link';

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContact();
    loadGroups();
  }, [contactId]);

  const loadContact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setContact(data);
    } catch (error) {
      console.error('Erreur chargement contact:', error);
      router.push('/contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
  try {
    const { data, error } = await supabase
      .from('contact_group_members')
      .select(`
        group:contact_groups(*)
      `)
      .eq('contact_id', contactId);

    if (error) throw error;
    
    // Filtrer les null et typer correctement
    const validGroups = (data || [])
      .map(d => d.group)
      .filter((g): g is ContactGroup => g !== null);
    
    setGroups(validGroups);
  } catch (error) {
    console.error('Erreur chargement groupes:', error);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/contacts"
            className="text-sm flex items-center gap-2 hover:underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span>←</span> Retour aux contacts
          </Link>
        </div>

        {/* En-tête du contact */}
        <div
          className="rounded-lg p-6 shadow-sm border mb-6"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {contact.first_name[0]}{contact.last_name[0]}
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {contact.first_name} {contact.last_name}
                  </h1>
                  {contact.job_title && (
                    <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                      {contact.job_title}
                      {contact.company && ` chez ${contact.company}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Coordonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="hover:underline"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <a
                      href={`tel:${contact.phone}`}
                      className="hover:underline"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.city && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {contact.city}{contact.country && `, ${contact.country}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Groupes */}
              {groups.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Groupes :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((group) => (
                      <Link
                        key={group.id}
                        href={`/groupes/${group.id}`}
                        className="px-3 py-1 rounded-full text-sm transition-all hover:opacity-80"
                        style={{
                          backgroundColor: `${group.color}20`,
                          color: group.color,
                        }}
                      >
                        🏢 {group.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes personnelles */}
              {contact.notes && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Notes :
                  </p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                    {contact.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href="/contacts"
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                }}
              >
                ✏️ Modifier
              </Link>
            </div>
          </div>
        </div>

        {/* Timeline des notes et évaluations */}
        <div
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <NotesTimeline
            type="contact"
            entityId={contactId}
            entityName={`${contact.first_name} ${contact.last_name}`}
          />
        </div>
      </div>
    </div>
  );
}