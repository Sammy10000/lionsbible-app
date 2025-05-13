'use client';

import { FaShare } from 'react-icons/fa';

interface ShareProps {
  onClick: () => void;
}

export default function Share({ onClick }: ShareProps) {
  const handleClick = () => {
    // Example: Web Share API
    if (navigator.share) {
      navigator.share({
        title: 'Share Page',
        url: window.location.href,
      });
    }
    onClick();
  };

  return (
    <button
      title="Share Page"
      aria-label="Share"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={handleClick}
    >
      <FaShare className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Share</span>
    </button>
  );
}