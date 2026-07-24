// Returns an Amap static map image without exposing the Web Service key.
module.exports = async function amapMapPreview(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const address = String(req.query?.address || "").trim();
  if (!address || address.length > 180) return res.status(400).json({ error: "INVALID_ADDRESS" });
  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) return res.status(503).json({ error: "MAP_PREVIEW_NOT_CONFIGURED" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const geocodeParams = new URLSearchParams({ key, address });
    const geocodeResponse = await fetch(`https://restapi.amap.com/v3/geocode/geo?${geocodeParams}`, { signal: controller.signal });
    if (!geocodeResponse.ok) throw new Error("GEOCODE_UNAVAILABLE");
    const geocode = await geocodeResponse.json();
    const location = geocode?.geocodes?.[0]?.location;
    if (String(geocode?.status) !== "1" || !location) return res.status(404).json({ error: "LOCATION_NOT_FOUND" });

    const mapParams = new URLSearchParams({ key, location, zoom: "15", size: "750*360", markers: `mid,,A:${location}` });
    const mapResponse = await fetch(`https://restapi.amap.com/v3/staticmap?${mapParams}`, { signal: controller.signal });
    if (!mapResponse.ok) throw new Error("MAP_UNAVAILABLE");
    const image = Buffer.from(await mapResponse.arrayBuffer());
    res.setHeader("Content-Type", mapResponse.headers.get("content-type") || "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(image);
  } catch (_) {
    return res.status(502).json({ error: "MAP_PREVIEW_UNAVAILABLE" });
  } finally {
    clearTimeout(timeout);
  }
};
