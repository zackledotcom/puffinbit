import React, { useEffect, useState, useRef } from 'react';
import { semanticEnhancementService } from '@/services/semanticEnhancementService';

interface Props {
  currentInput: string;
  setInput: (v: string) => void;
}

const PredictiveSuggestionBar: React.FC<Props> = ({ currentInput, setInput }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentInput.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await semanticEnhancementService.getLiveSuggestions(currentInput);
        setSuggestions(results);
        setError(null);
      } catch (err) {
        setError('Failed to fetch suggestions');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentInput]);

  const applySuggestion = (s: string) => {
    setInput(currentInput.trim() ? `${currentInput} ${s}` : s);
    setSuggestions([]);
  };

  if (!currentInput.trim()) return null;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {loading && <span className="text-xs text-blue-400">Loading...</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
      {!loading && !error && suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => applySuggestion(s)}
          className="px-2 py-1 bg-[#404040] rounded-md text-xs hover:bg-[#555]"
        >
          {s}
        </button>
      ))}
    </div>
  );
};

export default PredictiveSuggestionBar;