import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { describe, it, expect, vi } from 'vitest';
import WaitingPage from '$lib/components/challenges/WaitingPage.svelte';

describe('WaitingPage', () => {
    it('renders the title and formatted start time', () => {
        // Mock a start time in the future
        const startTime = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day from now
        
        renderWithProviders(WaitingPage, { 
            props: { 
                startTime,
                title: 'Starting soon'
            }
        });

        // Check for title
        expect(screen.getByText('Starting soon')).toBeInTheDocument();
        
        // Check for subtitle (actual text in component)
        expect(screen.getByText('Prepare your horses')).toBeInTheDocument();
        
        // Check if countdown labels are present
        expect(screen.getByText('Days')).toBeInTheDocument();
        expect(screen.getByText('Hours')).toBeInTheDocument();
        expect(screen.getByText('Minutes')).toBeInTheDocument();
        expect(screen.getByText('Seconds')).toBeInTheDocument();
    });

    it('renders "To be announced" if no startTime is provided', () => {
        renderWithProviders(WaitingPage, { 
            props: { 
                startTime: null,
                title: 'TBD'
            }
        });

        expect(screen.getByText('TBD')).toBeInTheDocument();
        expect(screen.getByText('To be announced')).toBeInTheDocument();
    });
});
