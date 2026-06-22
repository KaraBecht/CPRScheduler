import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/places/autocomplete", async (req, res) => {
  const apiKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "no_key", suggestions: [] });
    return;
  }

  const input = typeof req.query.input === "string" ? req.query.input.trim() : "";
  if (!input) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("types", "establishment|geocode");
    url.searchParams.set("key", apiKey);

    const r = await fetch(url.toString());
    if (!r.ok) {
      res.status(502).json({ error: "upstream_error", suggestions: [] });
      return;
    }

    const data = await r.json() as {
      predictions?: { description: string; place_id: string }[];
    };

    const suggestions = (data.predictions ?? []).map((p) => ({
      description: p.description,
      placeId: p.place_id,
    }));

    res.json({ suggestions });
  } catch {
    res.status(502).json({ error: "fetch_failed", suggestions: [] });
  }
});

export default router;
