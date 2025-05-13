'use client';

import { FaSave } from 'react-icons/fa';

interface SaveVerseProps {
  onClick: () => void;
}

export default function SaveVerse({ onClick }: SaveVerseProps) {
  return (
    <button
      title="Save verse"
      aria-label="Save verse"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaSave className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Save Verse</span>
    </button>
  );
}