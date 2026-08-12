/**
 * Mapbox address autocomplete input.
 * Reads VITE_MAPBOX_TOKEN from the environment.
 * Falls back to a plain input when the token is absent.
 */

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MapboxFeature {
  id: string;
  place_name: string;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MapboxAddressInput({
  value,
  onChange,
  placeholder = "123 Main St, City, State 12345",
}: Props) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch suggestions ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!TOKEN || value.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${encodeURIComponent(value)}.json` +
          `?access_token=${TOKEN}` +
          `&autocomplete=true` +
          `&country=US` +
          `&types=address,place,poi` +
          `&limit=6`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Mapbox ${res.status}`);
        const data: MapboxResponse = await res.json();
        setSuggestions(data.features);
        setOpen(data.features.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // ── Close dropdown on outside click ───────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Keyboard nav ──────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function select(feature: MapboxFeature) {
    onChange(feature.place_name);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // If no token: render a plain input so the form still works
  if (!TOKEN) {
    return (
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input row */}
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          className="pr-8"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : value.length >= MIN_CHARS ? (
          <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>

      {/* Suggestions dropdown */}
      {open && (
        <ul
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto py-1"
          role="listbox"
        >
          {suggestions.map((feat, idx) => (
            <li
              key={feat.id}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focus
                select(feat);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-sm ${
                idx === activeIndex
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-800 hover:bg-gray-50"
              }`}
            >
              <MapPin className="shrink-0 mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <span className="leading-snug">{feat.place_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
