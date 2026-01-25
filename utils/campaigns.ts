import { AdCampaign } from '../types';

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Helper to find a matching campaign from a provided list
export const findCampaignForText = (
  text: string,
  campaigns: AdCampaign[],
): AdCampaign | undefined => {
  if (!text || !campaigns || campaigns.length === 0) return undefined;

  const normalizedText = normalizeText(text);

  // Find the first active campaign where a keyword is present in the text
  return campaigns.find(
    (campaign) =>
      campaign.active &&
      campaign.keywords.some((keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        return normalizedText.includes(normalizedKeyword);
      }),
  );
};
