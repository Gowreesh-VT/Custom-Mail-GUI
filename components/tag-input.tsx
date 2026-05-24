"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (value: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  function commit() {
    const next = text.split(/[,\s;]/).map((item) => item.trim()).filter(Boolean);
    if (next.length) onChange(Array.from(new Set([...value, ...next])));
    setText("");
  }
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1">
      {value.map((item) => (
        <Badge key={item} variant="secondary" className="gap-1">
          {item}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== item))}><X className="h-3 w-3" /></button>
        </Badge>
      ))}
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="h-8 min-w-40 flex-1 border-0 px-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
