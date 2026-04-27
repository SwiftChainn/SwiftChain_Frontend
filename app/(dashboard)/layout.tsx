<<<<<<< feat/breadcrumbs
import React from 'react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
=======
import { Tour } from '@/components/onboarding/Tour';
>>>>>>> main

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
<<<<<<< feat/breadcrumbs
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-4 px-6 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">SwiftChain Dashboard</h1>
          {/* User profile / notifications placeholder */}
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6">
        <Breadcrumbs />
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {children}
        </div>
      </main>
    </div>
=======
    <>
      <Tour />
      {children}
    </>
>>>>>>> main
  );
}
