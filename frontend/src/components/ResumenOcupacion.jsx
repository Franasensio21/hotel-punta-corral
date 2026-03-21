function ResumenOcupacion({ habitaciones }) {
  const total    = habitaciones.length
  const ocupadas = habitaciones.filter(h => h.estado === 'ocupada').length
  const libres   = total - ocupadas
  const pct      = total > 0 ? Math.round((ocupadas / total) * 100) : 0

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
        <div className="text-5xl font-bold text-gray-800">{total}</div>
        <div className="text-base font-medium text-gray-500 mt-2">Total de habitaciones</div>
      </div>
      <div className="bg-green-50 rounded-2xl border-2 border-green-300 p-5 text-center shadow-sm">
        <div className="text-5xl font-bold text-green-700">{libres}</div>
        <div className="text-base font-semibold text-green-600 mt-2">Disponibles hoy</div>
      </div>
      <div className="bg-red-50 rounded-2xl border-2 border-red-300 p-5 text-center shadow-sm">
        <div className="text-5xl font-bold text-red-700">{ocupadas}</div>
        <div className="text-base font-semibold text-red-600 mt-2">Ocupadas · {pct}%</div>
      </div>
    </div>
  )
}

export default ResumenOcupacion
