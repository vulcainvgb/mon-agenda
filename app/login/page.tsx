'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  
  // Fonction pour se connecter
  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setMessage('✅ Connexion réussie !')
      // Rediriger vers le dashboard
      setTimeout(() => router.push('/dashboard'), 1000)
    }
    
    setLoading(false)
  }
  
  // Fonction pour créer un compte
  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setMessage('✅ Compte créé ! Vérifiez votre email pour confirmer.')
    }
    
    setLoading(false)
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-purple-900 mb-2 text-center">
          📱 Mon Agenda
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Connectez-vous pour accéder à votre espace
        </p>
        
        <div className="space-y-4">
          {/* Champ Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {/* Champ Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {/* Boutons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Chargement...' : '🔓 Se connecter'}
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Chargement...' : '✨ Créer un compte'}
            </button>
          </div>
          
          {/* Message de retour */}
          {message && (
            <div className={`p-4 rounded-lg text-center text-sm font-medium ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}