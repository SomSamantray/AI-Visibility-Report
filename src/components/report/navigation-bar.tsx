'use client';

import { cn } from '@/lib/utils';

interface NavigationBarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'sources', label: 'All Cited Sources' },
  { id: 'competitors', label: 'Competitors' },
];

export default function NavigationBar({ activeSection, onSectionChange }: NavigationBarProps) {
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="flex gap-8 px-8">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "px-1 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeSection === section.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
