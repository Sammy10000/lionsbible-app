'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface InterpretationSectionProps {
  verseId: string;
}

interface Interpretation {
  id: string;
  interpretation_text: string;
}

export default function InterpretationSection({ verseId }: InterpretationSectionProps) {
  const [interpretationText, setInterpretationText] = useState('');
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [textAreaStyles, setTextAreaStyles] = useState({
    color: "#484848",
    borderColor: "grey",
    backgroundColor: "#f8f9fa"
  });
  const supabase = createClient();

  // Set up dark mode observer for textarea
  useEffect(() => {
    const htmlElement = document.documentElement;
    const updateTextAreaStyles = () => {
      const isDark = htmlElement.classList.contains('dark');
      setTextAreaStyles({
        color: isDark ? "#ffffff" : "#484848",
        borderColor: isDark ? "#9CA3AF" : "grey",
        backgroundColor: isDark ? "#4B5563" : "#f8f9fa"
      });
    };

    updateTextAreaStyles();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTextAreaStyles();
        }
      });
    });

    observer.observe(htmlElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Fetch existing interpretations
  useEffect(() => {
    const fetchInterpretations = async () => {
      const { data } = await supabase
        .from('interpretations')
        .select('id, interpretation_text')
        .eq('verse_id', verseId);
      setInterpretations(data || []);
    };
    fetchInterpretations();
  }, [verseId, supabase]);

  // Handle interpretation submission
  const handleInterpretationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      alert('Please log in to add an interpretation.');
      return;
    }
    const { error } = await supabase
      .from('interpretations')
      .insert({ verse_id: verseId, user_id: user.user.id, interpretation_text: interpretationText });
    if (error) {
      return;
    }
    setInterpretations([...interpretations, { id: Date.now().toString(), interpretation_text: interpretationText }]);
    setInterpretationText('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Share Your Interpretation or Revelation
      </h2>

      {/* Interpretation Form */}
      <form onSubmit={handleInterpretationSubmit} className="space-y-4">
        <label htmlFor={`interpretation-${verseId}`} className="block text-black-700">
          Your Insight
        </label>
        <textarea
          id={`interpretation-${verseId}`}
          value={interpretationText}
          onChange={(e) => setInterpretationText(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={textAreaStyles}
          aria-label={`Interpretation for verse ${verseId}`}
          rows={4}
        />

        <button
          type="submit"
          className="bg-[#207788] border border-[#9CA3AF] text-white px-4 py-2 rounded hover:bg-[#1a5f6e] focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Submit
        </button>
      </form>

      {/* Display Interpretations */}
      {interpretations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-gray-700 font-semibold">Interpretations</h3>
          <ul className="list-disc pl-5 mt-2">
            {interpretations.map((interpretation) => (
              <li key={interpretation.id} className="text-gray-600">
                {interpretation.interpretation_text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}