'use client';

import { useState } from 'react';

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

// Mapping of books and specific verses/chapters to original languages
const getOriginalLanguage = (book: string, chapter: number, verse: number): string => {
  // New Testament books (Greek)
  const newTestamentBooks = [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
    'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation',
  ];

  // Aramaic sections with precise verse-level mappings
  const aramaicSections: {
    [key: string]: {
      chapters?: number[] | { start: number; end: number };
      verses?: { chapter: number; verse: number }[];
      mixedVerses?: { chapter: number; verse: number; languages: string };
    };
  } = {
    Daniel: {
      // Aramaic from 2:4b to 7:28
      chapters: { start: 2, end: 7 },
      mixedVerses: { chapter: 2, verse: 4, languages: 'Hebrew + Aramaic' },
    },
    Ezra: {
      // Aramaic in 4:8–6:18 and 7:12–26 (approximated by chapters)
      chapters: [{ start: 4, end: 6 }, { start: 7, end: 7 }],
    },
    Jeremiah: {
      // Aramaic in 10:11
      verses: [{ chapter: 10, verse: 11 }],
    },
    Genesis: {
      // Aramaic in 31:47 (two words)
      verses: [{ chapter: 31, verse: 47 }],
    },
  };

  // Check if the book is in the New Testament
  if (newTestamentBooks.includes(book)) {
    return 'Greek';
  }

  // Check for Aramaic sections
  if (book in aramaicSections) {
    const section = aramaicSections[book];

    // Check mixed verses (e.g., Daniel 2:4)
    if (section.mixedVerses && section.mixedVerses.chapter === chapter && section.mixedVerses.verse === verse) {
      return section.mixedVerses.languages;
    }

    // Check specific verses (e.g., Jeremiah 10:11, Genesis 31:47)
    if (section.verses?.some((v) => v.chapter === chapter && v.verse === verse)) {
      return 'Aramaic';
    }

    // Check chapter ranges (e.g., Daniel 2:5–7:28, Ezra 4:8–6:18)
    if (section.chapters) {
      if (Array.isArray(section.chapters)) {
        for (const range of section.chapters) {
          if (typeof range === 'number' && chapter === range) {
            return 'Aramaic';
          }
          if ('start' in range && chapter >= range.start && chapter <= range.end) {
            return 'Aramaic';
          }
        }
      } else if ('start' in section.chapters && chapter >= section.chapters.start && chapter <= section.chapters.end) {
        // For Daniel 2:5–7:28, exclude 2:4 (handled by mixedVerses)
        if (book === 'Daniel' && chapter === 2 && verse < 5) {
          return 'Hebrew';
        }
        return 'Aramaic';
      }
    }
  }

  return 'Hebrew';
};

const getLanguageCode = (originalLanguage: string): string => {
  switch (originalLanguage.toLowerCase()) {
    case 'hebrew':
      return 'he';
    case 'aramaic':
      return 'arc';
    case 'greek':
      return 'el'; 
    case 'hebrew + aramaic':
      return 'he';
    default:
      return 'he';
  }
};

export default function VerseCard({ verse }: { verse: Verse }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine the original language dynamically
  const originalLanguage = getOriginalLanguage(verse.book, verse.chapter, verse.verse);

  return (
    <article className="bg-white p-8 rounded-lg shadow-md mb-12">
      <div className="mt-6 text-gray-600">
        <h2 className="text-2xl font-extrabold mb-4">
          <strong>Original {originalLanguage}:</strong>
        </h2>
        <p lang={getLanguageCode(originalLanguage)} className="mt-3 text-lg font-semibold">{verse.original_text}</p>

        <h2 className="text-2xl font-extrabold mt-6 mb-4">
          <strong>Transliteration:</strong>
        </h2>
        <p className="mt-3 text-lg font-semibold">{verse.transliteration}</p>

        <h2 className="text-2xl font-extrabold mt-6 mb-4">
          <strong>Verbatim English:</strong>
        </h2>
        <p className="mt-3 text-lg font-semibold">{verse.verbatim_english}</p>

        <h2 className="text-2xl font-extrabold mt-6 mb-4">
          <strong>KJV:</strong>
        </h2>
        <p className="mt-3 text-lg font-semibold">{verse.kjv}</p>
      </div>
    </article>
  );
}