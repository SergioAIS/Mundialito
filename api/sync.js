import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log("🚀 [CRON] Despertando Bomba de Agua...");

  // Autenticación por Secreto de Vercel Cron o llave de paso manual para Sergio
  const isCron = req.headers.authorization === `Bearer ${process.env.VERCEL_CRON_SECRET}`;
  const isManual = req.query.secret === 'sergio2026';
  if (!isCron && !isManual && process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: "Acceso denegado a la bomba de agua." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Faltan variables SUPABASE_SERVICE_ROLE en Vercel." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const apiRes = await fetch('https://worldcup26.ir/get/games', { signal: controller.signal });
    clearTimeout(timeout);

    if (!apiRes.ok) throw new Error(`Irán respondió HTTP ${apiRes.status}`);
    const data = await apiRes.json();

    if (!data?.games || data.games.length === 0) throw new Error("JSON de Irán vino vacío");

    // Inyectamos el JSON íntegro en la cisterna bajo el ID estático 'singleton_fixture'
    const { error: dbErr } = await supabase
      .from('cache_partidos_mundial')
      .upsert({
        id: 'singleton_fixture',
        raw_json: data,
        actualizado_en: new Date().toISOString()
      });

    if (dbErr) throw dbErr;

    console.log("✅ [CRON] Supabase actualizado con 104 partidos frescos.");
    return res.status(200).json({ status: "ok", timestamp: new Date().toISOString(), partidos: data.games.length });

  } catch (error) {
    console.error("❌ [CRON Error]:", error.message);
    return res.status(502).json({ error: error.message });
  }
}
