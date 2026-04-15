import { getInfo } from '$lib/auth';
import { getTeam } from '$lib/team';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    try {
        const info = await getInfo();
        if (info && info.team_id) {
            const team = await getTeam(info.team_id);
            return {
                team
            };
        }
    } catch (err) {
        console.error('Error in team settings load:', err);
    }
    
    return {
        team: null
    };
};
