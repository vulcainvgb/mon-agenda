'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ContactGroup, Contact, ContactGroupMember } from '../../lib/types';
import Link from 'next/link';

export default function GroupesPage() {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<ContactGroupMember[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  // Formulaire groupe
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8b5cf6',
    type: 'general' as 'general' | 'family' | 'company' | 'friends' | 'professional',
  });

  useEffect(() => {
    fetchGroups();
    fetchContacts();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('contact_group_members')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      setGroupMembers(data || []);

      // Contacts disponibles (pas encore dans le groupe)
      const memberContactIds = (data || []).map(m => m.contact_id);
      const available = contacts.filter(c => !memberContactIds.includes(c.id));
      setAvailableContacts(available);
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingGroup) {
        const { error } = await supabase
          .from('contact_groups')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_groups')
          .insert([{
            ...formData,
            user_id: user.id,
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du groupe');
    }
  };

  const handleEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
      type: group.type,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Les contacts ne seront pas supprimés.')) return;

    try {
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGroups();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du groupe');
    }
  };

  const handleViewMembers = async (group: ContactGroup) => {
    setSelectedGroup(group);
    await fetchGroupMembers(group.id);
    setShowMembersModal(true);
  };

  const handleAddMember = async (contactId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('contact_group_members')
        .insert([{
          group_id: selectedGroup.id,
          contact_id: contactId,
          role: 'member',
        }]);

      if (error) throw error;
      await fetchGroupMembers(selectedGroup.id);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre:', error);
      alert('Erreur lors de l\'ajout du membre');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Retirer ce contact du groupe ?')) return;

    try {
      const { error } = await supabase
        .from('contact_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
      }
    } catch (error) {
      console.error('Erreur lors du retrait du membre:', error);
      alert('Erreur lors du retrait du membre');
    }
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      color: '#8b5cf6',
      type: 'general',
    });
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              🏢 Groupes de contacts
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {groups.length} groupe{groups.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <span className="text-lg">+</span>
            Nouveau groupe
          </button>
        </div>

        {/* Liste des groupes */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
          </div>
        ) : groups.length === 0 ? (
          <div 
            className="text-center py-12 rounded-lg"
            style={{ 
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <p className="text-lg">Aucun groupe créé</p>
            <p className="mt-2">Commencez par créer votre premier groupe !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg p-6 shadow-sm border transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {/* En-tête du groupe */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: `${group.color}20`,
                      color: group.color,
                    }}
                  >
                    {typeIcons[group.type]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {group.name}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {typeLabels[group.type]}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {group.description && (
                  <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    {group.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/groupes/${group.id}`}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all text-center"
                    style={{
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    👁️ Voir détails
                  </Link>
                  <button
                    onClick={() => handleViewMembers(group)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                    }}
                  >
                    👥
                  </button>
                  <button
                    onClick={() => handleEdit(group)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--color-error)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Création/Édition Groupe */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-lg shadow-xl max-w-md w-full"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {editingGroup ? '✏️ Modifier le groupe' : '➕ Nouveau groupe'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-2xl transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Nom du groupe *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="Ex: Famille Dupont, Équipe Marketing..."
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Type de groupe
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-lg border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {typeIcons[value as keyof typeof typeIcons]} {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Couleur */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Couleur
                  </label>
                  <div className="flex gap-2">
                    {['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className="w-10 h-10 rounded-lg border-2 transition-all"
                        style={{
                          backgroundColor: color,
                          borderColor: formData.color === color ? 'var(--color-text-primary)' : 'transparent',
                          transform: formData.color === color ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border transition-all resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="Description optionnelle..."
                  />
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                    }}
                  >
                    {editingGroup ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestion des Membres */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    👥 Membres de {selectedGroup.name}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {groupMembers.length} membre{groupMembers.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedGroup(null);
                    setGroupMembers([]);
                  }}
                  className="text-2xl transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  ×
                </button>
              </div>

              {/* Liste des membres actuels */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Membres actuels
                </h3>
                {groupMembers.length === 0 ? (
                  <p className="text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun membre dans ce groupe
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {member.contact?.first_name} {member.contact?.last_name}
                          </p>
                          {member.contact?.email && (
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {member.contact.email}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="px-3 py-1 rounded text-sm font-medium transition-all"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-error)',
                          }}
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ajouter des membres */}
              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Ajouter des membres
                </h3>
                {availableContacts.length === 0 ? (
                  <p className="text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Tous vos contacts sont déjà dans ce groupe
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.email && (
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {contact.email}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddMember(contact.id)}
                          className="px-3 py-1 rounded text-sm font-medium transition-all"
                          style={{
                            backgroundColor: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          Ajouter
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}