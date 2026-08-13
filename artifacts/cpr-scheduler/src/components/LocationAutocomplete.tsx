import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface Suggestion {
  description: string;
  placeId: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function LocationAutocomplete({ value, onChange, placeholder, "data-testid": testId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function fetchSuggestions(input: string) {
    if (!input.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/places/autocomplete?input=${encodeURIComponent(input)}`)
      .then((r) => r.json())
      .then((data: { error?: string; suggestions: Suggestion[] }) => {
        if (data.error === "no_key") {
          setNoKey(true);
          setOpen(false);
          return;
        }
        setNoKey(false);
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
        setActiveIdx(-1);
      })
      .catch(() => {});
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  }

  function pick(desc: string) {
    onChange(desc);
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pick(suggestions[activeIdx]!.description);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "Address"}
        data-testid={testId}
        autoComplete="off"
      />
      {noKey && (
        <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Address suggestions disabled — add a Google Maps API key to enable.
        </p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md text-sm max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${i === activeIdx ? "bg-accent" : "hover:bg-accent"}`}
              onMouseDown={(e) => { e.preventDefault(); pick(s.description); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{s.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
