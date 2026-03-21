import { useState } from 'react'
import Header from './components/Header'
import Disponibilidad from './pages/Disponibilidad'
import NuevaReserva from './pages/NuevaReserva'

const TABS = [
  { id: 'disponibilidad', label: '📋  Ver disponibilidad' },
  { id: 'nueva-reserva',  label: '➕  Nueva reserva'     },
]

function App() {
  const [tab, setTab] = useState('disponibilidad')

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      {/* Navegación */}
      <div className="bg-white border-b-2 border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-1 pt-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-6 py-3.5 text-base font-semibold rounded-t-xl border-b-4 transition-all
                  ${tab === t.id
                    ? 'border-blue-700 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'disponibilidad' && <Disponibilidad />}
        {tab === 'nueva-reserva'  && (
          <NuevaReserva onReservaCreada={() => setTab('disponibilidad')} />
        )}
      </main>
    </div>
  )
}

export default App
