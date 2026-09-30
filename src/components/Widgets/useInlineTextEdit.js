import { useEffect, useState } from 'react';

// Shared double-click-to-edit behavior for any widget whose content is plain user-typed text
// stored on the widget's own `style` — first built for TextBox.jsx, now reused by Shape.jsx
// (a shape that can hold text, the same way any Word/PowerPoint shape can) so the two don't
// each hand-roll the same draft/commit/cancel state machine.
export default function useInlineTextEdit(text, onTextChange) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);

  const startEditing = () => setEditing(true);
  const commit = () => {
    setEditing(false);
    if (draft !== text) onTextChange?.(draft);
  };
  const cancel = () => { setDraft(text); setEditing(false); };

  return { editing, draft, setDraft, startEditing, commit, cancel };
}
