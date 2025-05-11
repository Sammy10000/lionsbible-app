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

export default function VerseCard({ verse }: { verse: Verse }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
<article className="bg-white p-8 rounded-lg shadow-md mb-12">
  <div className="mt-6 text-gray-600">
    <h2 className="text-2xl font-extrabold mb-4">
      <strong>Original (Hebrew):</strong>
    </h2>
    <p className="mt-3 text-lg font-semibold">{verse.original_text}</p>

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