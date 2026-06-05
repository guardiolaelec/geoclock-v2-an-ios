// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL?.trim() || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
);

// ==========================================
// 1. LOGIN
// ==========================================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: users, error } = await supabase.from('users').select('*');
    
    if (error) {
      console.error("Error leyendo Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    const user = users.find(u => {
      // Limpiamos los saltos de línea del CSV, pero NO los espacios en blanco
      const dbEmail = u.email ? u.email.replace(/[\r\n]+/g, '').trim().toLowerCase() : '';
      const dbPass = u.password ? u.password.replace(/[\r\n]+/g, '').trim() : '';
      
      const inputEmail = email ? email.trim().toLowerCase() : '';
      const inputPass = password ? password.trim() : '';
      
      return dbEmail === inputEmail && dbPass === inputPass;
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const { password: _, ...safeUser } = user;
    res.json(safeUser);

  } catch (err) {
    console.error("Error del servidor:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. USUARIOS
// ==========================================
app.get(["/api/users", "/api/admin/users"], async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  res.json(error ? [] : data);
});

app.post(["/api/users", "/api/admin/users"], async (req, res) => {
  const { data, error } = await supabase.from('users').insert([req.body]).select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put(["/api/users/:id", "/api/admin/users/:id"], async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('users').update(req.body).eq('id', id).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

app.delete(["/api/users/:id", "/api/admin/users/:id"], async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ==========================================
// 3. SEDES
// ==========================================
app.get(["/api/worksites", "/api/admin/worksites"], async (req, res) => {
  try {
    const { data, error } = await supabase.from('sedes').select('*');
    if (error) throw error;
    const sedesFormateadas = (data || []).map(s => ({
      id: s.id, name: s.nombre, address: s.address || '', latitude: s.latitud, longitude: s.longitud, radius: s.radius || 100
    }));
    res.json(sedesFormateadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/worksites", "/api/admin/worksites"], async (req, res) => {
  try {
    const sedeTraducida = { nombre: req.body.name, latitud: req.body.latitude, longitud: req.body.longitude, address: req.body.address, radius: req.body.radius };
    const { data, error } = await supabase.from('sedes').insert([sedeTraducida]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data[0].id, name: data[0].nombre, latitude: data[0].latitud, longitude: data[0].longitud, radius: data[0].radius, address: data[0].address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put(["/api/worksites/:id", "/api/admin/worksites/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const sedeTraducida = { nombre: req.body.name, latitud: req.body.latitude, longitud: req.body.longitude, address: req.body.address, radius: req.body.radius };
    const { data, error } = await supabase.from('sedes').update(sedeTraducida).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Sede no encontrada" });
    res.json({ id: data[0].id, name: data[0].nombre, latitude: data[0].latitud, longitude: data[0].longitud, radius: data[0].radius, address: data[0].address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(["/api/worksites/:id", "/api/admin/worksites/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('sedes').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. FICHAJES Y HORAS EXTRA
// ==========================================
app.get("/api/records/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('fichajes').select('*, sedes(nombre)').eq('empleado_id', id).order('fecha_hora', { ascending: false });
  if (error || !data) return res.json([]);
  
  const formateado = data.map(r => ({
    id: r.id, user_id: r.empleado_id, worksite_id: r.sede_id, type: r.tipo === 'Entrada Jornada' ? 'IN' : 'OUT', latitude: r.latitud, longitude: r.longitud, distance: r.distancia_metros, notes: r.notes, timestamp: r.fecha_hora, worksite_name: r.sedes?.nombre || 'Sede desconocida',
    minutos_extra: r.minutos_extra, estado_extra: r.estado_extra
  }));
  res.json(formateado);
});

app.get("/api/admin/records", async (req, res) => {
  const { data, error } = await supabase.from('fichajes').select('*, users(name), sedes(nombre)').order('fecha_hora', { ascending: false });
  if (error || !data) return res.json([]);
  
  const formateado = data.map(r => ({
    id: r.id, user_id: r.empleado_id, worksite_id: r.sede_id, type: r.tipo === 'Entrada Jornada' ? 'IN' : 'OUT', latitude: r.latitud, longitude: r.longitud, distance: r.distancia_metros, notes: r.notes, timestamp: r.fecha_hora, user_name: r.users?.name || 'Usuario desconocido', worksite_name: r.sedes?.nombre || 'Sede desconocida',
    minutos_extra: r.minutos_extra, estado_extra: r.estado_extra
  }));
  res.json(formateado);
});

app.post("/api/clock", async (req, res) => {
  try {
    const { user_id, worksite_id, type, latitude, longitude, distance, notes, minutos_extra, estado_extra } = req.body;

    const tipoTraducido = type === 'IN' ? 'Entrada Jornada' : 'Salida Jornada';
    
    const nuevoFichajeEspañol = {
      empleado_id: user_id, 
      sede_id: worksite_id, 
      tipo: tipoTraducido, 
      latitud: latitude || 0, 
      longitud: longitude || 0, 
      distancia_metros: distance || 0, 
      notes: notes || '', 
      fecha_hora: new Date().toISOString(),
      minutos_extra: minutos_extra || 0,
      estado_extra: estado_extra || 'N/A'
    };

    const { data, error } = await supabase.from('fichajes').insert([nuevoFichajeEspañol]).select();
    
    if (error) return res.status(400).json({ error: error.message });
    
    res.status(201).json(data[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/status/:id", async (req, res) => {
  const { data } = await supabase.from('fichajes').select('*').eq('empleado_id', req.params.id).order('fecha_hora', { ascending: false }).limit(1);
  if (data && data.length > 0 && data[0].tipo === 'Entrada Jornada') {
    return res.json({ isClockedIn: true, startTime: data[0].fecha_hora });
  }
  res.json({ isClockedIn: false, startTime: null });
});

// ==========================================
// 5. ESTADÍSTICAS Y ALERTAS PENDIENTES
// ==========================================
app.get("/api/admin/stats", async (req, res) => {
  try {
    const { data: users } = await supabase.from('users').select('id');
    const hoy = new Date().toISOString().split('T')[0];
    const { data: fichajesHoy } = await supabase.from('fichajes').select('*').gte('fecha_hora', hoy);

    let totalMs = 0;
    const porEmpleado = {};
    (fichajesHoy || []).forEach(f => {
      if (!porEmpleado[f.empleado_id]) porEmpleado[f.empleado_id] = [];
      porEmpleado[f.empleado_id].push(f);
    });

    Object.values(porEmpleado).forEach(fichajes => {
      fichajes.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
      for (let i = 0; i < fichajes.length - 1; i++) {
        if (fichajes[i].tipo === 'Entrada Jornada' && fichajes[i+1].tipo === 'Salida Jornada') {
          totalMs += new Date(fichajes[i+1].fecha_hora).getTime() - new Date(fichajes[i].fecha_hora).getTime();
          i++; 
        }
      }
    });
    const horasHoy = (totalMs / 3600000).toFixed(1);
    const alertas = (fichajesHoy || []).filter(f => f.distancia_metros > 100 || f.estado_extra === 'PENDIENTE').length;

    res.json({ activeEmployees: users?.length || 0, totalHoursToday: horasHoy, pendingAlerts: alertas });
  } catch (err) {
    res.json({ activeEmployees: 0, totalHoursToday: "0.0", pendingAlerts: 0 });
  }
});

app.get("/api/admin/pending-records", async (req, res) => {
  try {
    const { data, error } = await supabase.from('fichajes').select('*, users(name), sedes(nombre)')
      .or('distancia_metros.gt.100,estado_extra.eq.PENDIENTE')
      .order('fecha_hora', { ascending: false });
    if (error || !data) return res.json([]);
    
    const formateado = data.map(r => ({
      id: r.id, user_name: r.users?.name || 'Usuario desconocido', worksite_name: r.sedes?.nombre || 'Sede desconocida', type: r.tipo === 'Entrada Jornada' ? 'IN' : 'OUT', timestamp: r.fecha_hora, notes: r.notes || 'Revisión requerida', is_manual: false,
      distance: r.distancia_metros, 
      minutos_extra: r.minutos_extra, estado_extra: r.estado_extra
    }));
    res.json(formateado);
  } catch (err) {
    res.json([]);
  }
});

app.post("/api/admin/records/approve", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (status === 'REJECTED') {
      await supabase.from('fichajes').update({ estado_extra: 'RECHAZADO', minutos_extra: 0 }).eq('id', id);
    } else {
      await supabase.from('fichajes').update({ distancia_metros: 0, estado_extra: 'APROBADO', notes: 'Aprobado por el Administrador' }).eq('id', id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. PERFIL DE USUARIO
// ==========================================
app.post("/api/users/change-password", async (req, res) => {
  try {
    const { id, oldPassword, newPassword } = req.body;
    const { data: user } = await supabase.from('users').select('password').eq('id', id).single();
    if (!user || user.password !== oldPassword) return res.status(400).json({ error: "La contraseña actual es incorrecta" });
    const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/update", async (req, res) => {
  try {
    const { id, name, department } = req.body;
    const { data, error } = await supabase.from('users').update({ name, department }).eq('id', id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  if (req.method === 'GET') return res.json([]);
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

export default app;
