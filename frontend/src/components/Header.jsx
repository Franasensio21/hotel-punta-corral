function Header() {
  return (
    <header className="bg-white border-b-2 border-gray-100 px-6 py-5 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-700 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">H</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">
              Hostal El Puerto
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Panel de reservas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span className="text-sm font-semibold text-green-700">Sistema activo</span>
        </div>
      </div>
    </header>
  )
}

export default Header
