import { driverEarningsService } from '@/services/driverEarningsService';
import { downloadCsv } from '@/lib/csvExport';
import type { DriverPayout } from '@/types/driverEarnings';

jest.mock('@/lib/api', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/websocket', () => ({ socketService: { socket: null } }));
jest.mock('@/lib/csvExport', () => {
  const actual = jest.requireActual('@/lib/csvExport');
  return { ...actual, downloadCsv: jest.fn() };
});

describe('driverEarningsService.exportPayouts', () => {
  it('serializes backend payout fields and triggers a dated CSV download', () => {
    const payout: DriverPayout = {
      id: 'payout-7',
      amountXlm: 23.5,
      destination: 'GDESTINATION',
      status: 'completed',
      txHash: 'transaction-hash',
      createdAt: '2026-11-25T10:00:00.000Z',
    };

    driverEarningsService.exportPayouts([payout]);

    expect(downloadCsv).toHaveBeenCalledWith(
      [
        'Payout ID,Amount (XLM),Destination,Status,Transaction Hash,Created At',
        'payout-7,23.5,GDESTINATION,completed,transaction-hash,2026-11-25T10:00:00.000Z',
      ].join('\r\n'),
      expect.stringMatching(/^driver-earnings-\d{4}-\d{2}-\d{2}\.csv$/),
    );
  });
});
