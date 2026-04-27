import { DisconnectButton } from '@/components/wallet/DisconnectButton';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 data-tour="dashboard-title">Admin Dashboard</h1>
      {/* Wallet session controls — see hooks/useWallet.ts for disconnect logic */}
      <div data-tour="disconnect-wallet">
        <DisconnectButton />
      </div>
    </div>
  );
}
