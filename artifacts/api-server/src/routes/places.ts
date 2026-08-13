import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/places/autocomplete", async (req, res) => {
  // Reuse the same token that the frontend Mapbox component uses
  const token = process.env["VITE_MAPBOX_TOKEN"];
  if (!token) {
    res.status(503).json({ error: "no_key", suggestions: [] });
    return;
  }

  const input = typeof req.query.input === "string" ? req.query.input.trim() : "";
  if (!input) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(input)}.json` +
      `?access_token=${token}` +
      `&autocomplete=true` +
      `&country=US` +
      `&types=address,place,poi` +
      `&limit=6`;

    const r = await fetch(url);
    if (!r.ok) {
      res.status(502).json({ error: "upstream_error", suggestions: [] });
      return;
    }

    const data = await r.json() as {
      features?: { id: string; place_name: string }[];
    };

    const suggestions = (data.features ?? []).map((f) => ({
      description: f.place_name,
      placeId: f.id,
    }));

    res.json({ suggestions });
  } catch {
    res.status(502).json({ error: "fetch_failed", suggestions: [] });
  }
});

export default router;
