import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cliente de Supabase (Sustituye a better-sqlite3)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  // --- API ROUTES (MIGRATED TO SUPABASE) ---

  // 1. LOGIN: Usamos el sistema de Auth de Supabase o tabla users
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users') // Asegúrate de tener esta tabla en Supabase
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  });

  // 2. OBTENER SEDES
  app.get("/api/worksites", async (req, res) => {
    const { data, error } = await supabase.from('sedes').select('*');
    res.json(data || []);
  });

  // 3. FICHAR (EL CORAZÓN: VALIDACIÓN DE 15 METROS)
  app.post("/api/clock", async (req, res) => {
    const { user_id, worksite_id, type, latitude, longitude, notes } = req.body;
    
    // Llamamos a la función SQL que creamos en el Paso 1
    const { data: estaCerca, error: geoError } = await supabase.rpc('validar_proximidad', {
      p_lat: latitude,
      p_lon: longitude,
      p_sede_id: worksite_id,
      p_radio_metros: 15
    });

    if (geoError || !estaCerca) {
      return res.status(403).json({ error: "Estás fuera del radio de 15 metros de la sede." });
    }

    // Si está cerca, guardamos el fichaje
    const { data, error } = await supabase
      .from('fichajes')
      .insert([{ 
        empleado_id: user_id, 
        sede_id: worksite_id, 
        tipo: type === 'IN' ? 'entrada' : 'salida',
        notes: notes 
      }])
      .select();

    if (error) return res.status(400).json(error);
    res.json({ id: data[0].id });
  });

  // 4. ESTADO ACTUAL (¿Está fichado?)
  app.get("/api/status/:userId", async (req, res) => {
    const { data, error } = await supabase
      .from('fichajes')
      .select('*')
      .eq('empleado_id', req.params.userId)
      .order('fecha_hora', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0 && data[0].tipo === 'entrada') {
      res.json({ isClockedIn: true, startTime: data[0].fecha_hora, worksiteId: data[0].sede_id });
    } else {
      res.json({ isClockedIn: false });
    }
  });

  // --- CONFIGURACIÓN DE VITE / DESPLIEGUE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GeoClock operativo en puerto ${PORT} con Supabase 🚀`);
  });
}

startServer();
