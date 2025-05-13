'use client';

import { FaUser } from 'react-icons/fa';

interface UserProfileProps {
  onClick?: () => void; // future authentication logic here...
}

export default function UserProfile({ onClick }: UserProfileProps) {
  return (
    <button
      title="Profile or sign in"
      aria-label="Profile or sign in"
      className="flex items-center space-x-3 lg:space-x-0 lg:justify-center text-gray-500 hover:text-teal-500 hover:bg-gray-100 lg:hover:bg-transparent p-2 rounded-md"
      onClick={onClick}
    >
      <FaUser className="w-6 h-6" />
    </button>
  );
}