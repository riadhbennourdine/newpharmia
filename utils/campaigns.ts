import { AdCampaign } from '../types';

// Helper to find a matching campaign from a provided list
export const findCampaignForText = (text: string, campaigns: AdCampaign[]): AdCampaign | undefined => {
  if (!text || !campaigns || campaigns.length === 0) return undefined;
  const lowerText = text.toLowerCase();
  
  // Find the first active campaign where a keyword is present in the text
  return campaigns.find(campaign => 
    campaign.active && 
    campaign.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  );
};