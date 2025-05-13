'use client';

import { FaVolumeUp } from 'react-icons/fa';

interface AudioProps {
  onClick: () => void;
}

export default function Audio({ onClick }: AudioProps) {
  return (
    <button
      title="Play audio"
      aria-label="Play audio"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaVolumeUp className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Audio</span>
    </button>
  );
}

