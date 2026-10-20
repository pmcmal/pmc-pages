// Cron Vercela pinguje edge function raz dziennie, zeby darmowy projekt Supabase
// nie wstrzymal sie po 7 dniach bez ruchu.
//
// Dlaczego tutaj, a nie tylko w GitHub Actions: zaplanowane workflow sa
// automatycznie wylaczane po 60 dniach bez commita w repo (stan
// DISABLED_INACTIVITY), czyli dokladnie wtedy, gdy projekt lezy odlogiem
// i najbardziej potrzebuje pingu. Cron Vercela nie ma takiego limitu.

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ ok: false, error: "Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY" });
  }

  try {
    const response = await fetch(`${url}/functions/v1/get-lyrics`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ artist: "Queen", title: "Bohemian Rhapsody" }),
    });

    return res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      status: response.status,
      pingedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(502).json({ ok: false, error: String(error) });
  }
}
