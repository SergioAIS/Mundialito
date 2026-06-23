import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Protección de ejecución
  if (req.query.secret !== 'sergio2026' && req.headers.authorization !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "Faltan llaves Service Role" });

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000);
    const apiRes = await fetch('https://worldcup26.ir/get/games', { signal: controller.signal });
    clearTimeout(id);

    if (!apiRes.ok) throw new Error(`API Irán falló con ${apiRes.status}`);
    const data = await apiRes.json();
    if (!data?.games) throw new Error("JSON vacío");

    await supabase.from('cache_partidos_mundial').upsert({
      id: 'singleton_fixture', raw_json: data, actualizado_en: new Date().toISOString()
    });

    return res.status(200).json({ status: "ok", timestamp: new Date().toISOString(), partidos: data.games.length });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
