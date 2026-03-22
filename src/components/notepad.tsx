'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const NOTEPAD_KEY = 'task-planner-notepad';

export function Notepad() {
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(NOTEPAD_KEY);
    if (saved) setContent(saved);
    setLoaded(true);
  }, []);

  const save = useCallback((value: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem(NOTEPAD_KEY, value);
    }, 300);
  }, []);

  const handleChange = (value: string) => {
    setContent(value);
    save(value);
  };

  if (!loaded) return null;

  return (
    <div className="flex flex-col min-w-[350px] flex-1 h-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h2 className="font-semibold text-sm">Notes</h2>
        {content.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {content.split('\n').filter(Boolean).length} lines
          </span>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Dump ideas, notes, and thoughts here..."
        className="w-full flex-1 bg-muted/30 border border-border rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed placeholder:text-muted-foreground/40"
        spellCheck={false}
      />
    </div>
  );
}
