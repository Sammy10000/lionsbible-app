'use client';

import { useState, useEffect } from 'react';

interface TTSButtonProps {
  text: string;
  verseId: string;
}

export default function TTSButton({ text, verseId }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    // Voices may load asynchronously in some browsers
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleTTS = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.8;
    utterance.rate = 0.7;

    // Select a male voice (prefer Microsoft David or any male voice)
    const maleVoice = voices.find(
      (voice) => voice.name.includes('David') || voice.name.toLowerCase().includes('male')
    );
    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <button
      onClick={handleTTS}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Play verse audio for ${verseId}`}
      disabled={!text}
    >
      {isPlaying ? 'Stop' : 'Play'}
    </button>
  );
}