"use client";

import { useEffect, useId, useState } from "react";
import {
  formatIsoToBrazil,
  maskBrazilDateDigits,
  parseBrazilToIso,
  parseFlexibleBirthToIso,
  todayIsoLocal,
} from "@/lib/brazil-date";
import { toast } from "sonner";

const baseFieldClass =
  "rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2 [color-scheme:dark]";

type BirthDateFieldProps = {
  id: string;
  value: string;
  onChange: (isoYyyyMmDd: string) => void;
  disabled?: boolean;
  className?: string;
};

export function BirthDateField({
  id,
  value,
  onChange,
  disabled,
  className = "",
}: BirthDateFieldProps) {
  const uid = useId();
  const maxIso = todayIsoLocal();
  const [text, setText] = useState(() => formatIsoToBrazil(value));

  useEffect(() => {
    setText(value ? formatIsoToBrazil(value) : "");
  }, [value]);

  function commitFromText(raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const iso = parseFlexibleBirthToIso(trimmed);
    if (iso) {
      onChange(iso);
      setText(formatIsoToBrazil(iso));
      return;
    }
    toast.error("Data inválida. Use DD/MM/AAAA (ex.: 15/03/1990).");
    setText(value ? formatIsoToBrazil(value) : "");
  }

  function onTextChange(raw: string) {
    const masked = maskBrazilDateDigits(raw);
    setText(masked);
    if (masked.length === 10) {
      const iso = parseBrazilToIso(masked);
      if (iso) onChange(iso);
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="DD/MM/AAAA"
          disabled={disabled}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={() => commitFromText(text)}
          className={`${baseFieldClass} min-w-0 flex-1 font-mono text-[15px] tracking-wide placeholder:text-slate-600 placeholder:font-sans placeholder:tracking-normal disabled:opacity-50`}
          aria-describedby={`${uid}-hint`}
        />
        <label
          className={`group relative flex h-[42px] w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-pitch-950/80 text-slate-400 transition hover:border-turf/40 hover:bg-white/5 hover:text-turf-bright ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <span className="pointer-events-none" aria-hidden>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
              />
            </svg>
          </span>
          <input
            type="date"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={value || ""}
            min="1900-01-01"
            max={maxIso}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v);
            }}
            aria-label="Abrir calendário"
          />
        </label>
      </div>
      <p id={`${uid}-hint`} className="text-xs text-slate-500">
        Digite o dia, mês e ano ou toque no ícone para escolher no calendário.
      </p>
    </div>
  );
}
