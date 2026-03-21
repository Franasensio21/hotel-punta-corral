const TIPO_LABEL = {
  double:    'Doble',
  triple:    'Triple',
  quad:      'Cuád.',
  quintuple: 'Quínt.',
}

const ESTADO_CONFIG = {
  libre:   { bg: '#22c55e', border: '#16a34a', texto: '#ffffff', label: 'LIBRE'   },
  booking: { bg: '#3b82f6', border: '#2563eb', texto: '#ffffff', label: 'BOOKING' },
  direct:  { bg: '#fb923c', border: '#ea580c', texto: '#ffffff', label: 'DIRECTA' },
  email:   { bg: '#a855f7', border: '#9333ea', texto: '#ffffff', label: 'GMAIL'   },
  group:   { bg: '#facc15', border: '#ca8a04', texto: '#1a1a1a', label: 'GRUPO'   },
  other:   { bg: '#9ca3af', border: '#6b7280', texto: '#ffffff', label: 'OTRO'    },
}

function TarjetaHabitacion({ habitacion }) {
  const ocupada = habitacion.estado === 'ocupada'
  const key     = ocupada ? (habitacion.origen || 'other') : 'libre'
  const config  = ESTADO_CONFIG[key] || ESTADO_CONFIG.other

  return (
    <div style={{
      backgroundColor: config.bg,
      border: `2px solid ${config.border}`,
      color: config.texto,
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px',
      aspectRatio: '1',
      cursor: 'default',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.07)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = 'none' }}
    >
      <span style={{ fontSize: '22px', fontWeight: '900', lineHeight: 1 }}>
        {habitacion.numero}
      </span>
      <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px', opacity: 0.9 }}>
        {TIPO_LABEL[habitacion.tipo] || habitacion.tipo}
      </span>
      <span style={{
        fontSize: '10px', fontWeight: '700', marginTop: '6px',
        padding: '2px 6px', borderRadius: '999px',
        backgroundColor: 'rgba(0,0,0,0.2)',
      }}>
        {config.label}
      </span>
      {habitacion.huesped && (
        <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.85, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {habitacion.huesped.split(' ')[0]}
        </span>
      )}
    </div>
  )
}

export default TarjetaHabitacion