'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ContactGroup, Contact, ContactGroupMember } from '../../../lib/types';
import NotesTimeline from '../../../components/NotesTimeline';
import Link from 'next/link';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<ContactGroup | null>(null);
  const [members, setMembers] = useState<ContactGroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroup();
    loadMembers();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('id', groupId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Erreur chargement groupe:', error);
      router.push('/groupes');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_group_members')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Erreur chargement membres:', error);
    }
  };

  const typeLabels = {
    general: 'Général',
    family: 'Famille',
    company: 'Entreprise',
    friends: 'Amis',
    professional: 'Professionnel',
  };

  const typeIcons = {
    general: '📋',
    family: '👨‍👩‍👧‍👦',
    company: '🏢',
    friends: '👥',
    professional: '💼',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/groupes"
            className="text-sm flex items-center gap-2 hover:underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span>←</span> Retour aux groupes
          </Link>
        </div>

        {/* En-tête du groupe */}
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
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{
                    backgroundColor: `${group.color}20`,
                    color: group.color,
                  }}
                >
                  {typeIcons[group.type]}
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {group.name}
                  </h1>
                  <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                    {typeLabels[group.type]} • {members.length} membre{members.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Description */}
              {group.description && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                    {group.description}
                  </p>
                </div>
              )}

              {/* Membres */}
              {members.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    Membres du groupe :
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {members.map((member) => (
                      <Link
                        key={member.id}
                        href={`/contacts/${member.contact_id}`}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            backgroundColor: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {member.contact?.first_name[0]}{member.contact?.last_name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {member.contact?.first_name} {member.contact?.last_name}
                          </p>
                          {member.contact?.email && (
                            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                              {member.contact.email}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {member.role}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href="/groupes"
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
            type="group"
            entityId={groupId}
            entityName={group.name}
          />
        </div>
      </div>
    </div>
  );
}