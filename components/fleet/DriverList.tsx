'use client';

import type { Driver, DriverStatus } from '@/types/fleet';

interface DriverListProps {
  drivers: Driver[];
}

const STATUS_LABEL: Record<DriverStatus, string> = {
  active: 'Active',
  on_delivery: 'On Delivery',
  idle: 'Idle',
  offline: 'Offline',
};

const STATUS_BADGE: Record<DriverStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_delivery: 'bg-blue-100 text-blue-700',
  idle: 'bg-amber-100 text-amber-700',
  offline: 'bg-gray-200 text-gray-700',
};

export function DriverList({ drivers }: DriverListProps) {
  if (drivers.length === 0) {
    return (
      <section
        aria-label="Driver list"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
      >
        No drivers in your fleet yet.
      </section>
    );
  }

  return (
    <section
      aria-label="Driver list"
      className="rounded-md border border-gray-200 bg-white"
    >
      <header className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">
          Active Drivers
        </h2>
      </header>

      <ul role="list" className="divide-y divide-gray-100">
        {drivers.map((driver) => (
          <li
            key={driver.id}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">{driver.name}</span>
              <span className="text-xs text-gray-500">
                {driver.vehicleType} · {driver.vehiclePlate}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">
                {driver.activeDeliveries} active · {driver.completedDeliveries} done
              </span>
              <span className="text-gray-500">★ {driver.rating.toFixed(1)}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[driver.status]}`}
              >
                {STATUS_LABEL[driver.status]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
