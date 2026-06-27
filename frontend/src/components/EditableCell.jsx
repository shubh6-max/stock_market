import { useEffect, useRef, useState } from "react";

/**
 * Click-to-edit cell. Saves on Enter or blur. Esc cancels.
 *
 * Props:
 *   value     current value (number | string | null)
 *   type      "number" | "text"
 *   step      step for number inputs
 *   placeholder
 *   prefix    leading symbol (e.g. "₹")
 *   onSave    async (newValue) => void
 *   format    optional formatter for display mode
 */
export default function EditableCell({
  value,
  type = "number",
  step = "any",
  placeholder = "--",
  prefix = "",
  onSave,
  format,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  async function commit() {
    if (!editing || busy) return;
    const raw = String(draft).trim();
    const next = raw === "" ? null : type === "number" ? Number(raw) : raw;
    setEditing(false);
    if (next === (value ?? null)) return;
    setBusy(true);
    try {
      await onSave(next);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="cell-input"
        type={type}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          else if (event.key === "Escape") cancel();
        }}
        onBlur={commit}
        autoFocus
      />
    );
  }

  const display = value == null || value === ""
    ? <span className="cell-empty">{placeholder}</span>
    : <span>{prefix}{format ? format(value) : value}</span>;

  return (
    <span
      className={`cell-editable ${busy ? "busy" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      title="Click to edit"
    >
      {display}
      {busy && <span className="cell-spin">...</span>}
    </span>
  );
}
