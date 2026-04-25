'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FleetSummary } from '@/types/fleet';

interface FleetStatsProps {
  summary: FleetSummary;
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#10b981',
  'On Delivery': '#3b82f6',
  Idle: '#f59e0b',
  Offline: '#6b7280',
};

export function FleetStats({ summary }: FleetStatsProps) {
  const data = [
    { name: 'Active', value: summary.activeDrivers },
    { name: 'On Delivery', value: summary.onDelivery },
    { name: 'Idle', value: summary.idle },
    { name: 'Offline', value: summary.offline },
  ];

  return (
    <section
      aria-label="Fleet status summary"
      className="rounded-md border border-gray-200 bg-white p-4"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Fleet Overview
        </h2>
        <span className="text-sm text-gray-500">
          {summary.totalDrivers} drivers
        </span>
      </header>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Drivers">
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
