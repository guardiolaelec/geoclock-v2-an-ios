import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Clock, MapPin, FileText, Activity } from 'lucide-react';

// Función auxiliar para manejar las URL de la API en entornos de vista previa (blob:)
const getApiUrl = (endpoint) => {
  if (typeof window !== 'undefined' && window.location.origin.startsWith('blob:')) {
    // Si estamos en la vista previa del Canvas, usamos la URL absoluta de tu Vercel
    return `https://geoclock-v2-an-ios-git-main-gguardiolas-projects.vercel.app${endpoint}`;
  }
  // En producción (Vercel), usamos la ruta relativa normal
  return endpoint;
};

export default function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulario temporal para la edición
  const [formData, setFormData] = useState({
    timestamp: '',
    type: 'IN',
    notes: '',
    estado_extra: ''
  });

  // Cargar los fichajes al iniciar
  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      // Usamos getApiUrl para evitar el error de "Failed to parse URL" en la vista previa
      const response = await fetch(getApiUrl('/api/admin/records'));
      if (!response.ok) throw new Error('Error al cargar los fichajes');
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los registros. Verifica la conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Abre el modal y prepara los datos
  const handleEditClick = (record) => {
    setEditingRecord(record);
    
    // Convertir fecha ISO a formato compatible con <input type="datetime-local">
    let localDatetime = '';
    if (record.timestamp) {
      const d = new Date(record.timestamp);
      // Ajustar por zona horaria local
      const offset = d.getTimezoneOffset() * 60000;
      localDatetime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    }

    setFormData({
      timestamp: localDatetime,
      type: record.type || 'IN',
      notes: record.notes || '',
      estado_extra: record.estado_extra || 'N/A'
    });
  };

  // Maneja los cambios en los inputs del formulario
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Envía la actualización al servidor
  const handleSave = async () => {
    try {
      setError('');
      setSuccessMsg('');
      
      // Convertir de nuevo a formato ISO para el backend
      const isoTimestamp = new Date(formData.timestamp).toISOString();

      const response = await fetch(getApiUrl(`/api/admin/records/${editingRecord.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: isoTimestamp,
          type: formData.type,
          notes: formData.notes,
          estado_extra: formData.estado_extra
        })
      });

      if (!response.ok) throw new Error('Error al actualizar el fichaje');

      setSuccessMsg('Fichaje actualizado correctamente');
      setEditingRecord(null);
      fetchRecords(); // Recargar la tabla con los datos frescos
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="text-orange-500" size={32} />
            Control de Fichajes - Administrador
          </h1>
          <p className="text-slate-500 mt-2">Valida, edita y corrige los registros horarios de los empleados.</p>
        </header>

        {/* Alertas */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMsg}
          </div>
        )}

        {/* Tabla de Registros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-semibold">Empleado</th>
                  <th className="p-4 font-semibold">Fecha y Hora</th>
                  <th className="p-4 font-semibold">Tipo</th>
                  <th className="p-4 font-semibold">Sede</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 font-semibold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">Cargando fichajes...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">No hay fichajes registrados.</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{record.user_name}</td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          {new Date(record.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          record.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {record.type === 'IN' ? 'ENTRADA' : 'SALIDA'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-slate-400" />
                          {record.worksite_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          record.estado_extra === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' :
                          record.estado_extra === 'APROBADO' ? 'bg-blue-100 text-blue-700' :
                          record.estado_extra === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {record.estado_extra || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleEditClick(record)}
                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Editar Fichaje"
                        >
                          <Edit2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ventana Modal de Edición */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 size={18} className="text-orange-500" />
                Editar Fichaje - {editingRecord.user_name}
              </h3>
              <button 
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Campo: Fecha y Hora */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha y Hora Exacta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="datetime-local"
                    name="timestamp"
                    value={formData.timestamp}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Campo: Tipo de Fichaje */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Movimiento</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                >
                  <option value="IN">ENTRADA (Inicio de jornada)</option>
                  <option value="OUT">SALIDA (Fin de jornada)</option>
                </select>
              </div>

              {/* Campo: Estado */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Estado / Validación</label>
                <select
                  name="estado_extra"
                  value={formData.estado_extra}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                >
                  <option value="N/A">Normal (N/A)</option>
                  <option value="PENDIENTE">PENDIENTE de revisión</option>
                  <option value="APROBADO">APROBADO</option>
                  <option value="RECHAZADO">RECHAZADO</option>
                </select>
              </div>

              {/* Campo: Notas */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notas del Administrador</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Justificación del cambio de hora..."
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-95"
              >
                <Save size={18} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
