import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fyigtm_upvotes';

// Get voted tools from localStorage
function getVotedTools() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save voted tools to localStorage
function setVotedTool(slug) {
  if (typeof window === 'undefined') return;
  try {
    const voted = getVotedTools();
    voted[slug] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voted));
  } catch {
    // Ignore localStorage errors
  }
}

// Check if user has voted for a tool
function hasVotedFor(slug) {
  const voted = getVotedTools();
  return Boolean(voted[slug]);
}

export function useUpvote(slug, initialUpvotes = 0) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    setHasVoted(hasVotedFor(slug));
  }, [slug]);

  // Fetch fresh count on mount (only update if server has a higher count)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(`/api/tools/upvotes?slugs=${encodeURIComponent(slug)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.upvotes && typeof data.upvotes[slug] === 'number') {
            const serverCount = data.upvotes[slug];
            // Only update if server has votes (don't reset to 0 if API returns nothing)
            if (serverCount > 0) {
              setUpvotes(serverCount);
            }
          }
        }
      } catch {
        // Keep initial count on error
      }
    };

    fetchCount();
  }, [slug]);

  const handleUpvote = useCallback(async (e) => {
    // Prevent parent click handlers (e.g., card navigation)
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Already voted or loading
    if (hasVoted || isLoading) return;

    setIsLoading(true);

    // Optimistic update
    setUpvotes(prev => prev + 1);
    setHasVoted(true);
    setVotedTool(slug);

    try {
      const response = await fetch('/api/tools/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update with server count only if it's valid (may differ if user was already tracked server-side)
        if (typeof data.upvotes === 'number' && data.upvotes > 0) {
          setUpvotes(data.upvotes);
        }
        if (data.alreadyVoted) {
          setHasVoted(true);
        }
      } else {
        // Revert optimistic update on error
        setUpvotes(prev => prev - 1);
        setHasVoted(false);
        // Remove from localStorage
        try {
          const voted = getVotedTools();
          delete voted[slug];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(voted));
        } catch {
          // Ignore
        }
      }
    } catch {
      // Revert optimistic update on network error
      setUpvotes(prev => prev - 1);
      setHasVoted(false);
      try {
        const voted = getVotedTools();
        delete voted[slug];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(voted));
      } catch {
        // Ignore
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug, hasVoted, isLoading]);

  return {
    upvotes,
    hasVoted,
    isLoading,
    handleUpvote,
  };
}

// Hook for fetching multiple upvote counts at once (for list views)
export function useUpvoteCounts(slugs = []) {
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchCounts = async () => {
      try {
        const response = await fetch(`/api/tools/upvotes?slugs=${encodeURIComponent(slugs.join(','))}`);
        if (response.ok) {
          const data = await response.json();
          setCounts(data.upvotes || {});
        }
      } catch {
        // Keep empty counts on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [slugs.join(',')]);

  return { counts, isLoading };
}
