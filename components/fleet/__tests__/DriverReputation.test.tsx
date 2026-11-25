import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriverReputation } from '../DriverReputation';
import { useDriverReputation } from '@/hooks/useDriverReputation';

// Mock the useDriverReputation hook
jest.mock('@/hooks/useDriverReputation', () => ({ useDriverReputation: jest.fn() }));
const mockedUseDriverReputation = useDriverReputation as jest.Mock;

describe('DriverReputation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the standard rating', () => {
    mockedUseDriverReputation.mockReturnValue({
      onChainScore: null,
      isLoading: false,
      error: null,
    });

    render(<DriverReputation driverId="1" standardRating={4.8} />);

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByTitle('Standard Platform Rating')).toBeInTheDocument();
  });

  it('should show a loading skeleton for the on-chain score', () => {
    mockedUseDriverReputation.mockReturnValue({
      onChainScore: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<DriverReputation driverId="1" standardRating={4.8} />);

    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('should render both standard and on-chain scores when available', () => {
    mockedUseDriverReputation.mockReturnValue({
      onChainScore: 1250,
      isLoading: false,
      error: null,
    });

    render(<DriverReputation driverId="1" standardRating={4.9} />);

    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(
      screen.getByTitle('Verified On-Chain Reputation Score'),
    ).toBeInTheDocument();
  });

  it('renders a verified zero separately from missing data', () => {
    mockedUseDriverReputation.mockReturnValue({
      onChainScore: 0,
      isLoading: false,
      error: null,
    });

    render(<DriverReputation driverId="1" standardRating={4.5} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(
      screen.queryByTitle('Verified On-Chain Reputation Score'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Verified On-Chain Points: 0')).toBeInTheDocument();
  });

  it('should open and close the information modal', () => {
    mockedUseDriverReputation.mockReturnValue({
      onChainScore: 1250,
      isLoading: false,
      error: null,
    });

    render(<DriverReputation driverId="1" standardRating={4.9} />);

    expect(screen.queryByText('About Reputation Scores')).not.toBeInTheDocument();

    const infoButton = screen.getByLabelText(
      'More information about reputation scores',
    );
    fireEvent.click(infoButton);

    expect(screen.getByText('About Reputation Scores')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Got it' });
    fireEvent.click(closeButton);

    expect(screen.queryByText('About Reputation Scores')).not.toBeInTheDocument();
  });
});

it('retries an unavailable score without displaying a fake verified zero', async () => {
  const refetch = jest.fn();
  mockedUseDriverReputation.mockReturnValue({ onChainScore: null, isLoading: false, error: 'Node unavailable', refetch });
  render(<DriverReputation driverId="driver-a" standardRating={4.8} />);
  expect(screen.queryByLabelText('Verified On-Chain Points: 0')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry on-chain reputation' }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it('closes the explanation with Escape and restores focus to its trigger', async () => {
  mockedUseDriverReputation.mockReturnValue({ onChainScore: 80, isLoading: false, error: null, refetch: jest.fn() });
  render(<DriverReputation driverId="driver-a" standardRating={4.8} />);
  const trigger = screen.getByRole('button', { name: 'More information about reputation scores' });
  await userEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'About Reputation Scores' })).toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
