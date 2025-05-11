'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface InteractionSectionProps {
  verseId: string;
}

export default function InteractionSection({ verseId }: InteractionSectionProps) {
  const [prayerText, setPrayerText] = useState('');
  const [interpretationText, setInterpretationText] = useState('');
  const [prayerPoints, setPrayerPoints] = useState<{ id: string; prayer_text: string }[]>([]);
  const [interpretations, setInterpretations] = useState<
    { id: string; interpretation_text: string }[]
  >([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);
  const supabase = createClient();

  // Check PWA install prompt availability
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setIsPWAInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fetch existing prayer points and interpretations
  useEffect(() => {
    const fetchData = async () => {
      const { data: prayerData } = await supabase
        .from('prayer_points')
        .select('id, prayer_text')
        .eq('verse_id', verseId);
      const { data: interpretationData } = await supabase
        .from('interpretations')
        .select('id, interpretation_text')
        .eq('verse_id', verseId);
      setPrayerPoints(prayerData || []);
      setInterpretations(interpretationData || []);
    };
    fetchData();
  }, [verseId]);

  // Check if verse is saved (requires authentication)
  useEffect(() => {
    const checkSaved = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('saved_verses')
          .select('id')
          .eq('verse_id', verseId)
          .eq('user_id', user.user.id)
          .single();
        setIsSaved(!!data);
      }
    };
    checkSaved();
  }, [verseId]);

  const handleSaveVerse = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to save verses.');
      return;
    }
    if (isSaved) {
      await supabase
        .from('saved_verses')
        .delete()
        .eq('verse_id', verseId)
        .eq('user_id', user.user.id);
      setIsSaved(false);
    } else {
      await supabase
        .from('saved_verses')
        .insert({ verse_id: verseId, user_id: user.user.id });
      setIsSaved(true);
    }
  };

  const handlePrayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to add prayer points.');
      return;
    }
    await supabase
      .from('prayer_points')
      .insert({ verse_id: verseId, user_id: user.user.id, prayer_text: prayerText });
    setPrayerPoints([...prayerPoints, { id: Date.now().toString(), prayer_text: prayerText }]);
    setPrayerText('');
  };

  const handleInterpretationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to add interpretations.');
      return;
    }
    await supabase.from('interpretations').insert({
      verse_id: verseId,
      user_id: user.user.id,
      interpretation_text: interpretationText,
    });
    setInterpretations([
      ...interpretations,
      { id: Date.now().toString(), interpretation_text: interpretationText },
    ]);
    setInterpretationText('');
  };

  const handleShare = async () => {
    const shareData = {
      title: `Bible Verse: ${verseId}`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/verses/${verseId}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDonate = async () => {
    const response = await fetch('/api/donate', { method: 'POST' });
    const { url } = await response.json();
    window.location.href = url;
  };

  const handleInstallPWA = () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then(() => {
        setIsPWAInstallable(false);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Verse */}
      <button
        onClick={handleSaveVerse}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label={isSaved ? `Unsave verse ${verseId}` : `Save verse ${verseId}`}
      >
        {isSaved ? 'Unsave Verse' : 'Save Verse'}
      </button>

      {/* Share Verse */}
      <button
        onClick={handleShare}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        aria-label={`Share verse ${verseId}`}
      >
        Share Verse
      </button>

      {/* Donate */}
      <button
        onClick={handleDonate}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        aria-label={`Donate for verse ${verseId}`}
      >
        Donate $5
      </button>

      {/* PWA Install */}
      {isPWAInstallable && (
        <button
          onClick={handleInstallPWA}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Install app"
        >
          Install App
        </button>
      )}

      {/* Prayer Points Form */}
      <form onSubmit={handlePrayerSubmit} className="space-y-2">
        <label htmlFor={`prayer-${verseId}`} className="block text-gray-700">
          Add Prayer Point
        </label>
        <textarea
          id={`prayer-${verseId}`}
          value={prayerText}
          onChange={(e) => setPrayerText(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Prayer point for ${verseId}`}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Submit prayer point for ${verseId}`}
        >
          Submit Prayer
        </button>
      </form>
      {prayerPoints.length > 0 && (
        <div>
          <h4 className="text-gray-700 font-semibold">Prayer Points</h4>
          <ul className="list-disc pl-5">
            {prayerPoints.map((point) => (
              <li key={point.id} className="text-gray-600">
                {point.prayer_text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interpretations Form */}
      <form onSubmit={handleInterpretationSubmit} className="space-y-2">
        <label htmlFor={`interpretation-${verseId}`} className="block text-gray-700">
          Add Interpretation
        </label>
        <textarea
          id={`interpretation-${verseId}`}
          value={interpretationText}
          onChange={(e) => setInterpretationText(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Interpretation for ${verseId}`}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Submit interpretation for ${verseId}`}
        >
          Submit Interpretation
        </button>
      </form>
      {interpretations.length > 0 && (
        <div>
          <h4 className="text-gray-700 font-semibold">Interpretations</h4>
          <ul className="list-disc pl-5">
            {interpretations.map((interp) => (
              <li key={interp.id} className="text-gray-600">
                {interp.interpretation_text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}