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

// 1. LOGIN (MODO RESISTENTE AL CSV)
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) return res.status(400).json({ error: error.message });

    const user = users.find(u => {
      const dbEmail = u.email ? u.email.replace(/[\r\n\s]+/g, '').toLowerCase() : '';
      const dbPass = u.password ? u.password.replace(/[\r\n\s]+/g, '') : '';
      const inputEmail = email ? email.replace(/[\r\n\s]+/g, '').toLowerCase() : '';
      const inputPass = password ? password.replace(/[\r\n\s]+/g, '') : '';
      return dbEmail === inputEmail && dbPass === inputPass;
    });

    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. USUARIOS Y 3. SEDES
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
  const { data, error } = await supabase.from('sedes').select('*');
  res.json(error ? [] : data.map(s => ({ id: s.id, name: s.nombre, latitude: s.latitud, longitude: s.longitud, radius: s.radius || 100 })));
});

// 4. FICHAJES (MODO PRUEBA)
app.post("/api/clock", async (req, res) => {
  try {
    const { user_id, worksite_id, type } = req.body;
    const nuevoFichaje = {
      empleado_id: user_id, 
      sede_id: worksite_id || 1, 
      tipo: type === 'IN' ? 'Entrada Jornada' : 'Salida Jornada', 
      latitud: 0, longitud: 0, distancia_metros: 0, 
      fecha_hora: new Date().toISOString(), estado_extra: 'N/A'
    };
    const { data, error } = await supabase.from('fichajes').insert([nuevoFichaje]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/records/:id", async (req, res) => {
  const { data, error } = await supabase.from('fichajes').select('*, sedes(nombre)').eq('empleado_id', req.params.id).order('fecha_hora', { ascending: false });
  res.json(error ? [] : data.map(r => ({ id: r.id, type: r.tipo === 'Entrada Jornada' ? 'IN' : 'OUT', timestamp: r.fecha_hora, worksite_name: r.sedes?.nombre || 'Sede' })));
});

app.get("/api/admin/records", async (req, res) => {
  const { data, error } = await supabase.from('fichajes').select('*, users(name), sedes(nombre)').order('fecha_hora', { ascending: false });
  res.json(error ? [] : data.map(r => ({ id: r.id, user_name: r.users?.name, type: r.tipo === 'Entrada Jornada' ? 'IN' : 'OUT', timestamp: r.fecha_hora, worksite_name: r.sedes?.nombre })));
});

// 5. ESTADÍSTICAS
app.get("/api/admin/stats", async (req, res) => {
  const { data: users } = await supabase.from('users').select('id');
  res.json({ activeEmployees: users?.length || 0, totalHoursToday: "08.5", pendingAlerts: 0 });
});

app.get("/api/status/:id", async (req, res) => {
  const { data } = await supabase.from('fichajes').select('*').eq('empleado_id', req.params.id).order('fecha_hora', { ascending: false }).limit(1);
  const clockedIn = data && data.length > 0 && data[0].tipo === 'Entrada Jornada';
  res.json({ isClockedIn: clockedIn, startTime: clockedIn ? data[0].fecha_hora : null });
});

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
export default app;
