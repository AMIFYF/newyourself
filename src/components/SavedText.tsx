import { useEffect, useRef } from "react";

// Keep keystrokes immediate while the persistence layer acquires its cross-tab lock.
// External changes update an idle field; the active editor keeps its current draft.
export function SavedText({
  value,
  onSave,
  label,
  placeholder,
  maxLength,
  multiline = false,
}: {
  value: string;
  onSave: (value: string) => void;
  label: string;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current)
      ref.current.value = value;
  }, [value]);
  const props = {
    ref,
    defaultValue: value,
    "aria-label": label,
    placeholder,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onSave(e.target.value),
  };
  return multiline ? <textarea {...props} /> : <input {...props} />;
}
