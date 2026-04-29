import { Tour } from '@/components/onboarding/Tour';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Tour />
      {children}
    </>
  );
}