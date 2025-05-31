'use client';

import { useEffect, useState, useCallback } from 'react';
import VerseCard from './VerseCard';
import InterpretationSection from './InterpretationSection';
import InboundReferences from './InboundReferences';
import Navigation from './Navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Verse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  original_text: string;
  transliteration: string;
  verbatim_english: string;
  kjv: string;
}

interface UserProfile {
  user_id: string;
  username: string | null;
  avatar: string | null;
}

function VersePageClient({
  verse,
  prevVerse,
  nextVerse,
  userProfile,
  params,
}: {
  verse: Verse | null;
  prevVerse: { book: string; chapter: number; verse: number } | null;
  nextVerse: { book: string; chapter: number; verse: number } | null;
  userProfile: UserProfile | null;
  params: { book: string; chapter: string; verse: string };
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<{ [key: string]: boolean }>({});

  // Memoized dark mode checker
  const checkDarkMode = useCallback(() => {
    const container = document.querySelector('.bg-container');
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    if (container) {
      container.classList.toggle('bg-gray-100', !isDark);
      container.classList.toggle('bg-black', isDark);
    }
  }, []);

  // Handle dark mode changes
  useEffect(() => {
    checkDarkMode(); // Initial check

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [checkDarkMode]);

  // Handle invalid verse
  if (!verse) {
    return (
      <div className="min-h-screen bg-container py-8 px-4 flex items-center justify-center">
        <p className="text-gray-800 dark:text-gray-100 text-lg">
          Verse not found. Please try another verse.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-container py-8 px-4" role="main">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1
          className="text-3xl font-bold mb-8 text-center"
          aria-label={`${verse.book} ${verse.chapter}:${verse.verse}`}
        >
          {verse.book} {verse.chapter}:{verse.verse}
        </h1>
        <VerseCard verse={verse} />
        <InterpretationSection
          verseId={verse.id}
          userProfile={userProfile}
          onSuccess={() => toast.success('Insight submitted successfully!', { theme: isDarkMode ? 'dark' : 'light' })}
          accordionOpen={accordionOpen}
          setAccordionOpen={setAccordionOpen}
        />
        <InboundReferences verseId={verse.id} />
        <Navigation
          prevVerse={prevVerse}
          nextVerse={nextVerse}
          currentBook={params.book}
        />
        <ToastContainer position="top-right" autoClose={3000} theme={isDarkMode ? 'dark' : 'light'} />
      </div>
    </div>
  );
}

export default VersePageClient;