// src/components/InterpretationForm.tsx
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import sanitizeHtml from 'sanitize-html';
import { InterpretationType, Counts } from '@/types';

interface ReferenceInput {
  book: string;
  chapter: number;
  fromVerse: number;
  toVerse: number;
  reference_text: string;
}

interface Props {
  verseId: string;
  userProfile: { id: string; username: string | null; avatar: string | null } | null;
  onSuccess?: () => void;
  setInterpretations: (fn: (prev: InterpretationType[]) => InterpretationType[]) => void;
  counts: { [key: string]: Counts };
  setCounts: (fn: (prev: { [key: string]: Counts }) => { [key: string]: Counts }) => void;
  books: string[];
  chapters: { [book: string]: number[] };
  verses: { [key: string]: number[] };
  fetchChapters: (book: string) => void;
  fetchVerses: (book: string, chapter: number) => void;
  setIsModalOpen: (open: boolean) => void; // Added for auth modal
}

export default function InterpretationForm({
  verseId,
  userProfile,
  onSuccess,
  setInterpretations,
  counts,
  setCounts,
  books,
  chapters,
  verses,
  fetchChapters,
  fetchVerses,
  setIsModalOpen,
}: Props) {
  const [interpretationText, setInterpretationText] = useState('');
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false); // Renamed to avoid conflict
  const [referenceInput, setReferenceInput] = useState<ReferenceInput>({
    book: '',
    chapter: 0,
    fromVerse: 0,
    toVerse: 0,
    reference_text: '',
  });
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const sanitizeInput = (input: string): string => {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
      allowedClasses: {},
      textFilter: (text) => text,
      disallowedTagsMode: 'discard',
    }).trim();
  };

  const isValidText = (input: string): boolean => {
    const codePattern =
      /(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|\b(function|eval|alert|script|SELECT|INSERT|DELETE|DROP|UNION|EXEC|DECLARE|CREATE|ALTER)\b)/i;
    return !codePattern.test(input);
  };

  useEffect(() => {
    if (referenceInput.book) {
      fetchChapters(referenceInput.book);
    }
  }, [referenceInput.book, fetchChapters]);

  useEffect(() => {
    if (referenceInput.book && referenceInput.chapter) {
      fetchVerses(referenceInput.book, referenceInput.chapter);
    }
  }, [referenceInput.book, referenceInput.chapter, fetchVerses]);

  const handleAddReference = async () => {
    if (
      !referenceInput.book ||
      !referenceInput.chapter ||
      !referenceInput.fromVerse ||
      !referenceInput.toVerse ||
      !referenceInput.reference_text
    ) {
      setError('Please fill in all fields.');
      toast.error('Please fill in all reference fields.', {
        toastId: 'reference-error',
        theme: 'light',
        autoClose: 5000,
      });
      return;
    }

    if (referenceInput.fromVerse > referenceInput.toVerse) {
      setError('Ending verse cannot be before starting verse.');
      toast.error('Ending verse cannot be before starting verse.', {
        toastId: 'verse-range-error',
        theme: 'light',
        autoClose: 5000,
      });
      return;
    }

    const sanitizedReferenceText = sanitizeInput(referenceInput.reference_text);
    if (!isValidText(sanitizedReferenceText)) {
      setError('Reference text contains invalid characters or code.');
      toast.error('Reference text contains invalid characters or code.', {
        toastId: 'reference-code-error',
        theme: 'light',
        autoClose: 5000,
      });
      return;
    }

    for (let v = referenceInput.fromVerse; v <= referenceInput.toVerse; v++) {
      const { data, error: verseError } = await supabase
        .from('verses')
        .select('id')
        .eq('book', referenceInput.book)
        .eq('chapter', referenceInput.chapter)
        .eq('verse', v)
        .single();

      if (verseError || !data) {
        setError(`Verse ${referenceInput.book} ${referenceInput.chapter}:${v} not found.`);
        toast.error(`Verse ${referenceInput.book} ${referenceInput.chapter}:${v} not found.`, {
          toastId: 'verse-not-found',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }
    }

    const referenceLink =
      referenceInput.fromVerse === referenceInput.toVerse
        ? `[${referenceInput.book} ${referenceInput.chapter}:${referenceInput.fromVerse}]`
        : `[${referenceInput.book} ${referenceInput.chapter}:${referenceInput.fromVerse}-${referenceInput.toVerse}]`;

    setInterpretationText((prev) => `${prev} ${referenceLink} (${sanitizedReferenceText})`.trim());
    setIsReferenceModalOpen(false);
    setReferenceInput({ book: '', chapter: 0, fromVerse: 0, toVerse: 0, reference_text: '' });
    setError(null);
    toast.success('Reference added to your insight!', {
      toastId: 'reference-success',
      theme: 'light',
      autoClose: 5000,
    });
  };

  const handleInterpretationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setIsModalOpen(true); // Trigger authentication modal
        toast.info('Please log in to add an interpretation.', {
          toastId: 'auth-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }

      const sanitizedText = sanitizeInput(interpretationText);
      if (!isValidText(sanitizedText)) {
        toast.error('Interpretation contains invalid characters or code.', {
          toastId: 'interpretation-code-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }

      const { data: existingInterpretation, error: checkError } = await supabase
        .from('interpretations')
        .select('id')
        .eq('verse_id', verseId)
        .eq('user_id', user.id)
        .eq('is_hidden', false)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        toast.error(`Error checking existing interpretation: ${checkError.message}`, {
          toastId: 'check-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }

      if (existingInterpretation) {
        toast.error('You’ve already shared an interpretation for this verse. You can only add replies.', {
          toastId: 'existing-interpretation',
          theme: 'light',
          autoClose: 7000,
        });
        return;
      }

      const words = sanitizedText.trim().split(/\s+/).filter((word) => word.length > 0);
      if (words.length < 12) {
        toast.error('Interpretation must be at least 12 words.', {
          toastId: 'word-count-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }

      const { data, error } = await supabase
        .from('interpretations')
        .insert({
          verse_id: verseId,
          user_id: user.id,
          text: sanitizedText,
          is_hidden: false,
        })
        .select('id, text, user_id')
        .single();

      if (error) {
        toast.error(`Failed to submit interpretation: ${error.message}`, {
          toastId: 'submit-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, avatar')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('interpretation_counts')
        .insert({
          interpretation_id: data.id,
          reply_count: 0,
          upvote_count: 0,
          report_count: 0,
        });

      setCounts((prev) => ({
        ...prev,
        [data.id]: {
          interpretation_id: data.id,
          reply_count: 0,
          upvote_count: 0,
          report_count: 0,
        },
      }));

      const referenceRegex = /\[([^\]]+)\]\s*\(([^)]+)\)/g;
      const references: { book: string; chapter: number; verse: number; reference_text: string }[] = [];
      let match;
      while ((match = referenceRegex.exec(sanitizedText)) !== null) {
        const [book, chapterVerse] = match[1].split(' ');
        let chapter: number, fromVerse: number, toVerse: number;
        if (chapterVerse.includes('-')) {
          const [ch, verseRange] = chapterVerse.split(':');
          chapter = parseInt(ch);
          const [startVerse, endVerse] = verseRange.split('-').map(Number);
          fromVerse = startVerse;
          toVerse = endVerse || startVerse;
        } else {
          const [ch, v] = chapterVerse.split(':').map(Number);
          chapter = ch;
          fromVerse = v;
          toVerse = v;
        }
        for (let verse = fromVerse; verse <= toVerse; verse++) {
          references.push({
            book,
            chapter,
            verse,
            reference_text: sanitizeInput(match[2]),
          });
        }
      }

      for (const ref of references) {
        const { data: targetVerse } = await supabase
          .from('verses')
          .select('id')
          .eq('book', ref.book)
          .eq('chapter', ref.chapter)
          .eq('verse', ref.verse)
          .single();

        if (targetVerse) {
          await supabase
            .from('verse_references')
            .insert({
              source_verse_id: verseId,
              target_verse_id: targetVerse.id,
              user_id: user.id,
              reference_text: ref.reference_text,
              is_hidden: false,
            });
        }
      }

      setInterpretations((prev) => [
        {
          id: data.id,
          interpretation_text: sanitizedText,
          user_id: user.id,
          username: profile?.username || 'Anonymous',
          avatar: profile?.avatar || null,
        },
        ...prev,
      ]);

      setInterpretationText('');
      onSuccess?.();
      toast.success('Interpretation submitted!', {
        toastId: 'submit-success',
        theme: 'light',
        autoClose: 5000,
      });
    } catch (error) {
      console.error('Unexpected error in handleInterpretationSubmit:', error);
      toast.error('Unexpected error during submission', {
        toastId: 'submit-unexpected-error',
        theme: 'light',
        autoClose: 5000,
      });
      setIsModalOpen(true); // Trigger auth modal on unexpected errors
    }
  };

  return (
    <>
      <form onSubmit={handleInterpretationSubmit} className="space-y-6 w-full max-w-full overflow-x-hidden m-2 sm:m-4">
        <label htmlFor={`interpretation-${verseId}`} className="block text-gray-600 text-sm sm:text-base">
          Your Interpretations
        </label>
        <textarea
          id={`interpretation-${verseId}`}
          value={interpretationText}
          onChange={(e) => setInterpretationText(e.target.value)}
          className="w-[93%] p-2 ms-2 border border-gray-300 rounded bg-white text-gray-600 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500 ring-offset-2 max-w-full overflow-x-hidden break-words m-2"
          aria-label={`Interpretation for verse ${verseId}`}
          rows={4}
        />
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
          <button
            type="button"
            onClick={() => setIsReferenceModalOpen(true)}
            className="bg-[#207788] text-white px-4 py-2 w-[92%] sm:w-auto rounded hover:bg-[#1a5f6e] text-sm sm:text-base focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
          >
            Add Scripture Reference
          </button>
          <button
            type="submit"
            className="bg-[#207788] text-white px-4 py-2 w-[92%] sm:w-auto rounded hover:bg-[#1a5f6e] text-sm sm:text-base focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
          >
            Submit
          </button>
        </div>
      </form>

      {isReferenceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-x-hidden">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm mx-2 sm:max-w-md sm:mx-4 overflow-x-hidden m-2 sm:m-4">
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-4">Add Scripture Reference</h3>
            {error && <p className="text-red-500 mb-4 text-sm break-words">{error}</p>}
            <div className="space-y-6 text-gray-600 max-w-full">
              <div>
                <label htmlFor="book" className="block text-gray-600 text-sm">Book</label>
                <select
                  id="book"
                  value={referenceInput.book}
                  onChange={(e) =>
                    setReferenceInput({
                      ...referenceInput,
                      book: e.target.value,
                      chapter: 0,
                      fromVerse: 0,
                      toVerse: 0,
                      reference_text: '',
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded bg-white text-gray-600 text-sm max-w-full focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
                  aria-label="Select a book"
                >
                  <option value="">Select a book</option>
                  {books.map((book) => (
                    <option key={book} value={book}>{book}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chapter" className="block text-gray-600 text-sm">Chapter</label>
                <select
                  id="chapter"
                  value={referenceInput.chapter}
                  onChange={(e) =>
                    setReferenceInput({
                      ...referenceInput,
                      chapter: parseInt(e.target.value) || 0,
                      fromVerse: 0,
                      toVerse: 0,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded bg-white text-gray-600 text-sm max-w-full focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
                  disabled={!referenceInput.book}
                  aria-label="Select a chapter"
                >
                  <option value={0}>Select a chapter</option>
                  {referenceInput.book &&
                    chapters[referenceInput.book]?.map((chapter) => (
                      <option key={chapter} value={chapter}>{chapter}</option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 m-2">
                <div className="flex-1">
                  <label htmlFor="from-verse" className="block text-gray-600 text-sm">From Verse</label>
                  <select
                    id="from-verse"
                    value={referenceInput.fromVerse}
                    onChange={(e) =>
                      setReferenceInput({
                        ...referenceInput,
                        fromVerse: parseInt(e.target.value) || 0,
                        toVerse: referenceInput.toVerse < parseInt(e.target.value) ? 0 : referenceInput.toVerse,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-600 text-sm max-w-full focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
                    disabled={!referenceInput.book || !referenceInput.chapter}
                    aria-label="Select starting verse"
                  >
                    <option value={0}>Select start verse</option>
                    {referenceInput.book &&
                      referenceInput.chapter &&
                      verses[`${referenceInput.book}-${referenceInput.chapter}`]?.map((verse) => (
                        <option key={verse} value={verse}>{verse}</option>
                      ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="to-verse" className="block text-gray-600 text-sm">To Verse</label>
                  <select
                    id="to-verse"
                    value={referenceInput.toVerse}
                    onChange={(e) =>
                      setReferenceInput({
                        ...referenceInput,
                        toVerse: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-600 text-sm max-w-full focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
                    disabled={!referenceInput.book || !referenceInput.chapter || !referenceInput.fromVerse}
                    aria-label="Select ending verse"
                  >
                    <option value={0}>Select end verse</option>
                    {referenceInput.book &&
                      referenceInput.chapter &&
                      referenceInput.fromVerse &&
                      verses[`${referenceInput.book}-${referenceInput.chapter}`]
                        ?.filter((verse) => verse >= referenceInput.fromVerse)
                        ?.map((verse) => (
                          <option key={verse} value={verse}>{verse}</option>
                        ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="reference-text" className="block text-gray-600 text-sm">Why is this relevant?</label>
                <textarea
                  id="reference-text"
                  value={referenceInput.reference_text}
                  onChange={(e) => setReferenceInput({ ...referenceInput, reference_text: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-gray-600 text-sm max-w-full overflow-x-hidden break-words focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
                  rows={3}
                  aria-label="Explain why this reference is relevant"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 m-2">
                <button
                  type="button"
                  onClick={handleAddReference}
                  className="bg-[#207788] text-white px-4 py-2 rounded hover:bg-[#1a5f6e] text-sm focus:ring-2 focus:ring-teal-500 ring-offset-2 m-2"
                >
                  Add Reference
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReferenceModalOpen(false);
                    setError(null);
                  }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 text-sm focus:ring-2 focus:ring-gray-500 ring-offset-2 m-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}