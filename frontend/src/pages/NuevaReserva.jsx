import { useState, useEffect } from 'react'
import api from '../api'

function NuevaReserva({ onReservaCreada }) {
  const [canales, setCanales]       = useState([])
  const [habitaciones, setHabitaciones] = useState([])
  const [cargando, setCargando]     = useState(false)
  const [exito, setExito]           = useState(false)
  const [error, setError]           = useState(null)

  const [form, setForm] = useState({
    room_id: '', channel_id: '', check_in: '', check_out: '',
    guest_name: '', guest_email: '', notes: '',
  })

  useEffect(() => {
    api.get('/canales').then(r => setCanales(r.data))
    api.get('/habitaciones', { params: { hotel_id: 1 } }).then(r => setHabitaciones(r.data))
  }, [])

  const TIPO_LABEL = {
    double: 'Doble', triple: 'Triple',
    quad: 'Cuádruple', quintuple: 'Quíntuple',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setExito(false)
    setCargando(true)

    try {
      let guest_id = null
      if (form.guest_name.trim()) {
        const g = await api.post('/clientes', {
          name:  form.guest_name,
          email: form.guest_email || null,
        }, { params: { hotel_id: 1 } })
        guest_id = g.data.id
      }

      await api.post('/reservar', {
        room_id:    parseInt(form.room_id),
        channel_id: parseInt(form.channel_id),
        check_in:   form.check_in,
        check_out:  form.check_out,
        guest_id,
        notes: form.notes || null,
      }, { params: { hotel_id: 1 } })

      setExito(true)
      setForm({ room_id: '', channel_id: '', check_in: '', check_out: '', guest_name: '', guest_email: '', notes: '' })
      setTimeout(() => onReservaCreada && onReservaCreada(), 1500)

    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo crear la reserva. Intentá de nuevo.'
      setError(msg)
    } finally {
      setCargando(false)
    }
  }

  const campo = (key, value) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Nueva reserva</h2>
        <p className="text-base text-gray-500 mt-1">Completá los datos para registrar una reserva</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">

        {/* Habitación */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-gray-800">
            Habitación <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.room_id}
            onChange={e => campo('room_id', e.target.value)}
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50"
          >
            <option value="">— Elegí una habitación —</option>
            {habitaciones.map(h => (
              <option key={h.id} value={h.id}>
                Habitación {h.number} · {TIPO_LABEL[h.type]} · {h.capacity} personas
              </option>
            ))}
          </select>
        </div>

        {/* Canal */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-gray-800">
            ¿Por dónde llegó la reserva? <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.channel_id}
            onChange={e => campo('channel_id', e.target.value)}
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50"
          >
            <option value="">— Elegí el canal —</option>
            {canales.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-base font-bold text-gray-800">
              Fecha de entrada <span className="text-red-500">*</span>
            </label>
            <input
              type="date" required
              value={form.check_in}
              onChange={e => campo('check_in', e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-base font-bold text-gray-800">
              Fecha de salida <span className="text-red-500">*</span>
            </label>
            <input
              type="date" required
              value={form.check_out}
              onChange={e => campo('check_out', e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
        </div>

        {/* Huésped */}
        <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-4 border border-gray-200">
          <p className="text-base font-bold text-gray-700">
            Datos del huésped <span className="text-gray-400 font-normal text-sm">(opcional)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-600">Nombre completo</label>
              <input
                type="text"
                placeholder="Ej: Ana García"
                value={form.guest_name}
                onChange={e => campo('guest_name', e.target.value)}
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <input
                type="email"
                placeholder="Ej: ana@email.com"
                value={form.guest_email}
                onChange={e => campo('guest_email', e.target.value)}
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-gray-800">
            Notas <span className="text-gray-400 font-normal text-sm">(opcional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Cualquier información adicional sobre esta reserva..."
            value={form.notes}
            onChange={e => campo('notes', e.target.value)}
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 bg-gray-50 resize-none"
          />
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 rounded-xl px-5 py-4 text-base font-medium">
            ⚠️ {error}
          </div>
        )}
        {exito && (
          <div className="bg-green-50 border-2 border-green-300 text-green-800 rounded-xl px-5 py-4 text-base font-semibold">
            ✅ Reserva creada correctamente. Volviendo al panel...
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={cargando}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-bold rounded-xl px-6 py-4 text-lg transition-colors shadow-sm"
        >
          {cargando ? 'Guardando reserva...' : 'Confirmar reserva'}
        </button>
      </form>
    </div>
  )
}

export default NuevaReserva