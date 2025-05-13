'use client';

import { FaDownload } from 'react-icons/fa';

interface InstallAppProps {
  onClick: () => void;
}

export default function InstallApp({ onClick }: InstallAppProps) {
  return (
    <button
      title="Install app"
      aria-label="Install app"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaDownload className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Install App</span>
    </button>
  );
}