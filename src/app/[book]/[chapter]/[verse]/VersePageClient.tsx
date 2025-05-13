'use client';

import { useEffect, useState } from 'react';
import VerseCard from './VerseCard';
import InterpretationSection from './InterpretationSection';
import Navigation from './Navigation';

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

function VersePageClient({
  verse,
  prevVerse,
  nextVerse,
  params,
}: {
  verse: Verse;
  prevVerse: { book: string; chapter: number; verse: number } | null;
  nextVerse: { book: string; chapter: number; verse: number } | null;
  params: { book: string; chapter: string; verse: string };
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark class on html element and manage bg classes
  useEffect(() => {
    const container = document.querySelector('.bg-container');
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (container) {
        if (isDark) {
          container.classList.remove('bg-gray-100');
          container.classList.add('bg-black');
        } else {
          container.classList.remove('bg-black');
          container.classList.add('bg-gray-100');
        }
      }
    };

    checkDarkMode(); // Initial check

    // Listen for changes to the class
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Toggle dark mode for testing
  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="min-h-screen bg-container py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          {verse.book} {verse.chapter}:{verse.verse}
        </h1>
        <VerseCard verse={verse} />
        <InterpretationSection verseId={verse.id} />
        <Navigation
          prevVerse={prevVerse}
          nextVerse={nextVerse}
          currentBook={params.book}
        />
        
      </div>
    </div>
  );
}

export default VersePageClient;