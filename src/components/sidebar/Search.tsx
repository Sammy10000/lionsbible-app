'use client';

import { FaSearch } from 'react-icons/fa';

interface SearchProps {
  onClick: () => void;
}

export default function Search({ onClick }: SearchProps) {
  return (
    <button
      title="Search Lion's Bible"
      aria-label="Search Lion's Bible"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaSearch className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Search</span>
    </button>
  );
}