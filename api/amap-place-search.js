// Vercel serverless function: keeps the Amap Web Service key off the client.
// Configure AMAP_WEB_SERVICE_KEY in Vercel environment variables.

module.exports = async function amapPlaceSearch(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const query = String(req.query?.q || "").trim();
  if (query.length < 2 || query.length > 80) return res.status(200).json({ places: [] });

  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) return res.status(503).json({ error: "PLACE_SEARCH_NOT_CONFIGURED" });

  const params = new URLSearchParams({ key, keywords: query, page_size: "8", show_fields: "business" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://restapi.amap.com/v5/place/text?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error("AMAP_UNAVAILABLE");
    const data = await response.json();
    const pois = Array.isArray(data?.pois) ? data.pois : [];
    const places = pois.map((poi) => ({
      id: String(poi.id || poi.poi_id || ""),
      name: String(poi.name || ""),
      address: String(poi.address || poi.formatted_address || poi.adname || ""),
      city: String(poi.cityname || poi.city || ""),
      location: String(poi.location || ""),
    })).filter((poi) => poi.name);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ places });
  } catch (_) {
    return res.status(502).json({ error: "PLACE_SEARCH_UNAVAILABLE" });
  } finally {
    clearTimeout(timeout);
  }
};
