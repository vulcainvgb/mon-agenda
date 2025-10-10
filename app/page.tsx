import Link from 'next/link'  // ← IMPORTANT : importer Link

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-900 mb-4">
          Mon Agenda Personnel
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Bienvenue dans votre assistant numérique
        </p>
        
        {/* Carte avec les liens */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Accès rapide
          </h2>
          
          <div className="space-y-4">
            {/* Lien vers Calendrier */}
            <Link 
              href="/calendrier"
              className="block bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📅 Voir mon calendrier
            </Link>

            {/* Lien vers dashboard */}
            <Link 
              href="/dashboard"
              className="block bg-blue-500 text-white px-6 py-4 rounded-lg hover:bg-blue-500 transition-colors"
            >
              📈 Voir le dashboard
            </Link>
            
            {/* Lien vers Tâches */}
            <Link 
              href="/taches"
              className="block bg-blue-400 text-white px-6 py-4 rounded-lg hover:bg-blue-400 transition-colors"
            >
              ✅ Gérer mes tâches
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}