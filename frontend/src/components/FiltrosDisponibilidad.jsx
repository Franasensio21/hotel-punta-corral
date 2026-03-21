function FiltrosDisponibilidad({ filtros, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Filtros de búsqueda</p>
      <div className="flex flex-wrap gap-4 items-end">

        <div className="flex flex-col gap-2">
          <label className="text-base font-semibold text-gray-700">Fecha</label>
          <input
            type="date"
            value={filtros.fecha}
            onChange={e => onChange({ ...filtros, fecha: e.target.value })}
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-base font-semibold text-gray-700">Tipo de habitación</label>
          <select
            value={filtros.tipo}
            onChange={e => onChange({ ...filtros, tipo: e.target.value })}
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50 min-w-44"
          >
            <option value="">Todas</option>
            <option value="double">Doble (2 personas)</option>
            <option value="triple">Triple (3 personas)</option>
            <option value="quad">Cuádruple (4 personas)</option>
            <option value="quintuple">Quíntuple (5 personas)</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-base font-semibold text-gray-700">Canal de reserva</label>
          <select
            value={filtros.origen}
            onChange={e => onChange({ ...filtros, origen: e.target.value })}
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-blue-500 bg-gray-50 min-w-44"
          >
            <option value="">Todos</option>
            <option value="booking">Booking.com</option>
            <option value="direct">Reserva directa</option>
            <option value="email">Gmail / Email</option>
            <option value="group">Grupo</option>
          </select>
        </div>

        {(filtros.tipo || filtros.origen) && (
          <button
            onClick={() => onChange({ ...filtros, tipo: '', origen: '' })}
            className="px-5 py-3 rounded-xl border-2 border-gray-300 text-base font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}

export default FiltrosDisponibilidad
