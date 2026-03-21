import { useState, useEffect } from 'react'
import api from '../api'
import FiltrosDisponibilidad from '../components/FiltrosDisponibilidad'
import TarjetaHabitacion from '../components/TarjetaHabitacion'
import ResumenOcupacion from '../components/ResumenOcupacion'

function hoy() {
  return new Date().toISOString().split('T')[0]
}

const LEYENDA = [
  { color: '#22c55e', label: 'Libre'   },
  { color: '#3b82f6', label: 'Booking' },
  { color: '#fb923c', label: 'Directa' },
  { color: '#a855f7', label: 'Gmail'   },
  { color: '#facc15', label: 'Grupo'   },
  { color: '#9ca3af', label: 'Otro'    },
]

function Disponibilidad() {
  const [filtros, setFiltros]           = useState({ fecha: hoy(), tipo: '', origen: '' })
  const [habitaciones, setHabitaciones] = useState([])
  const [cargando, setCargando]         = useState(false)
  const [error, setError]               = useState(null)

  useEffect(() => {
    if (!filtros.fecha) return
    setCargando(true)
    setError(null)

    const params = { fecha: filtros.fecha, hotel_id: 1 }
    if (filtros.tipo)   params.tipo   = filtros.tipo
    if (filtros.origen) params.origen = filtros.origen

    api.get('/disponibilidad', { params })
      .then(res => setHabitaciones(res.data.habitaciones))
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setCargando(false))
  }, [filtros])

  const fechaLegible = filtros.fecha
    ? new Date(filtros.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Disponibilidad</h2>
        {fechaLegible && <p className="text-lg text-gray-600 mt-1 capitalize">{fechaLegible}</p>}
      </div>

      <FiltrosDisponibilidad filtros={filtros} onChange={setFiltros} />

      {cargando && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <p className="text-xl text-gray-400 font-medium">Cargando...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-6 py-4">
          <p className="text-base font-semibold text-red-800">{error}</p>
        </div>
      )}

      {!cargando && !error && (
        <>
          <ResumenOcupacion habitaciones={habitaciones} />

          {/* Leyenda */}
          <div className="bg-white rounded-xl border-2 border-gray-200 px-5 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Referencias de colores</p>
            <div className="flex flex-wrap gap-4">
              {LEYENDA.map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: l.color }} />
                  <span className="text-sm font-medium text-gray-700">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grilla */}
          {habitaciones.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
              <p className="text-xl text-gray-400">No hay habitaciones para mostrar</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
              gap: '12px',
            }}>
              {habitaciones.map(h => (
                <TarjetaHabitacion key={h.room_id} habitacion={h} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Disponibilidad