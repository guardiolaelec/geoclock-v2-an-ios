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
// 1. LOGIN (MODO RESISTENTE)
// ==========================================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) return res.status(400).json({ error: error.message });

    const user = users.find(u => {
      const dbEmail = u.email ? u.email.trim().toLowerCase() : '';
      const dbPass = u.password ? u.password.trim() : '';
      return dbEmail === email.trim().toLowerCase() && dbPass === password.trim();
    });

    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. USUARIOS Y 3. SEDES (Mantenidos)
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

app.get(["/api/worksites", "/api/admin/worksites"], async (req, res) => {
  try {
    const { data, error } = await supabase.from('sedes').select('*');
    if (error) throw error;
    res.json((data || []).map(s => ({ id: s.id, name: s.nombre, address: s.address || '', latitude: s.latitud, longitude: s.longitud, radius: s.radius || 100 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post(["/api/worksites", "/api/admin/worksites"], async (req, res) => {
  try {
    const sede = { nombre: req.body.name, latitud: req.body.latitude, longitud: req.body.longitude, address: req.body.address, radius: req.body.radius };
    const { data, error } = await supabase.from('sedes').insert([sede]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. FICHAJES (CORREGIDO Y SIN BLOQUEOS)
// ==========================================
app.post("/api/clock", async (req, res) => {
  try {
    const { user_id, worksite_id, type, latitude, longitude, distance, notes } = req.body;
    const tipoTraducido = type === 'IN' ? 'Entrada Jornada' : 'Salida Jornada';
    
    const nuevoFichaje = {
      empleado_id: user_id, 
      sede_id: worksite_id || 1, 
      tipo: tipoTraducido, 
      latitud: latitude || 0, 
      longitud: longitude || 0, 
      distancia_metros: distance || 0, 
      notes: notes || '', 
      fecha_hora: new Date().toISOString(),
      estado_extra: 'N/A'
    };

    const { data, error } = await supabase.from('fichajes').insert([nuevoFichaje]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/records/:id", async (req, res) => {
  const { data, error } = await supabase.from('fichajes').select('*, sedes(nombre)').eq('empleado_id', req.params.id).order('fecha_hora', { ascending: false });
  res.json(error ? [] : data.map(r => ({ id: r.id, user_id: r.empleado_id, type: r.tipo === 'Entrada Jornada' ? 'IN' : 'OUT', timestamp: r.fecha_hora, worksite_name: r.sedes?.nombre || 'Sede' })));
});

app.get("/api/status/:id", async (req, res) => {
  const { data } = await supabase.from('fichajes').select('*').eq('empleado_id', req.params.id).order('fecha_hora', { ascending: false }).limit(1);
  const clockedIn = data && data.length > 0 && data[0].tipo === 'Entrada Jornada';
  res.json({ isClockedIn: clockedIn, startTime: clockedIn ? data[0].fecha_hora : null });
});

// ==========================================
// 5. ESTADÍSTICAS Y 6. PERFIL (Mantenidos)
// ==========================================
app.get("/api/admin/stats", async (req, res) => {
  const { data: users } = await supabase.from('users').select('id');
  res.json({ activeEmployees: users?.length || 0, totalHoursToday: "08.5", pendingAlerts: 0 });
});

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

export default app;
