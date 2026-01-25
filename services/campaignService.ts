import { AdCampaign } from '../types';

const API_URL = '/api/campaigns';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const campaignService = {
  // Get all campaigns (Admin)
  getAllCampaigns: async (): Promise<AdCampaign[]> => {
    const response = await fetch(API_URL, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
  },

  // Get active campaigns (Public/User)
  getActiveCampaigns: async (): Promise<AdCampaign[]> => {
    const response = await fetch(`${API_URL}/active`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch active campaigns');
    return response.json();
  },

  // Create a campaign
  createCampaign: async (
    campaign: Omit<AdCampaign, '_id' | 'createdAt'>,
  ): Promise<AdCampaign> => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(campaign),
    });
    if (!response.ok) throw new Error('Failed to create campaign');
    return response.json();
  },

  // Update a campaign
  updateCampaign: async (
    id: string,
    updates: Partial<AdCampaign>,
  ): Promise<AdCampaign> => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update campaign');
    return response.json();
  },

  // Delete a campaign
  deleteCampaign: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete campaign');
  },

  // Track impression or click
  track: async (id: string, type: 'impression' | 'click'): Promise<void> => {
    try {
      await fetch(`${API_URL}/${id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
    } catch (error) {
      console.error('Error tracking campaign:', error);
    }
  },
};
