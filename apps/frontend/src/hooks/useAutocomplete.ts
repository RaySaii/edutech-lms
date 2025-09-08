import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api/base';

export interface UseAutocompleteOptions {
  enabled?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  type?: string;
}

export interface UseAutocompleteReturn {
  suggestions: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  getSuggestions: (query: string) => Promise<void>;
  clear: () => void;
  currentQuery: string;
}

export const useAutocomplete = (options: UseAutocompleteOptions = {}): UseAutocompleteReturn => {
  const {
    enabled = true,
    debounceMs = 150,
    minQueryLength = 2,
    type,
  } = options;

  // State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const performAutocomplete = useCallback(async (query: string) => {
    if (!enabled || !query || query.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const params = new URLSearchParams({ query });
      if (type) params.append('type', type);

      const response = await api.get<{ data: { suggestions: string[] } }>(
        `/search/autocomplete?${params.toString()}`
      );

      setSuggestions(response.data.data.suggestions);
      setCurrentQuery(query);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Autocomplete failed'));
      setSuggestions([]);
      console.error('Autocomplete error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, minQueryLength, type]);

  const getSuggestions = useCallback((query: string): Promise<void> => {
    return new Promise((resolve) => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        await performAutocomplete(query);
        resolve();
      }, debounceMs);

      setDebounceTimer(timer);
    });
  }, [debounceTimer, debounceMs, performAutocomplete]);

  const clear = useCallback(() => {
    setSuggestions([]);
    setCurrentQuery('');
    setIsError(false);
    setError(null);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    suggestions,
    isLoading,
    isError,
    error,
    getSuggestions,
    clear,
    currentQuery,
  };
};

export default useAutocomplete;