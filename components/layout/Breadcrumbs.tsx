'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Breadcrumbs: React.FC = () => {
  const breadcrumbs = useBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="mb-6 flex items-center space-x-2 text-sm font-medium"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className="flex items-center">
            {index !== 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-slate-400 shrink-0" />
            )}
            
            {breadcrumb.isLast ? (
              <span className="text-indigo-600 font-semibold truncate max-w-[200px]">
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className={cn(
                  "flex items-center text-slate-500 hover:text-indigo-600 transition-colors duration-200",
                  index === 0 && "hover:bg-slate-100 p-1 rounded-md"
                )}
              >
                {index === 0 && <Home className="mr-1 h-4 w-4" />}
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
