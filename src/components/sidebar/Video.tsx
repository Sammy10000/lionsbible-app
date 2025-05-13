'use client';

import { FaVideo } from 'react-icons/fa';

interface VideoProps {
  onClick: () => void;
}

export default function Video({ onClick }: VideoProps) {
  return (
    <button
      title="Watch video"
      aria-label="Watch video"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaVideo className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Video</span>
    </button>
  );
}