export interface AdCampaign {
  id: string;
  keywords: string[]; // Case insensitive keywords to match
  sponsorName: string;
  productName: string;
  description: string;
  imageUrl?: string;
  link: string;
  active: boolean;
}

export const CAMPAIGNS: AdCampaign[] = [
  {
    id: 'doliprane-focus',
    keywords: ['Paracétamol', 'Fièvre', 'Douleur'],
    sponsorName: 'Sanofi',
    productName: 'Doliprane 1000mg',
    description: 'Le réflexe numéro 1 contre la douleur et la fièvre. Disponible en gélules, comprimés et sachets.',
    imageUrl: 'https://www.doliprane.fr/images/gamme/doliprane-1000mg-comprime-secable.png', 
    link: 'https://www.doliprane.fr',
    active: true
  },
  {
    id: 'humex-rhume',
    keywords: ['Rhume', 'Nez bouché', 'Pseudoéphédrine'],
    sponsorName: 'Urgo',
    productName: 'Humex Rhume',
    description: 'Traitement symptomatique de la congestion nasale au cours du rhume.',
    imageUrl: 'https://www.humex.fr/wp-content/uploads/2020/09/humex-rhume-comprimes.png',
    link: 'https://www.humex.fr',
    active: true
  },
  {
    id: 'avene-eau-thermale',
    keywords: ['Eau thermale', 'Apaisant', 'Hydratation'],
    sponsorName: 'Avène',
    productName: 'Spray Eau Thermale',
    description: 'Apaise, adoucit et prévient les irritations cutanées. Pour toute la famille.',
    imageUrl: 'https://www.eau-thermale-avene.fr/sites/default/files/styles/product_detail/public/2021-02/3282779003131_eau-thermale-spray_300ml_f_p_s_0.png',
    link: 'https://www.eau-thermale-avene.fr',
    active: true
  }
];

export const findCampaignForText = (text: string): AdCampaign | undefined => {
  if (!text) return undefined;
  const lowerText = text.toLowerCase();
  
  // Find the first campaign where a keyword is present in the text
  return CAMPAIGNS.find(campaign => 
    campaign.active && 
    campaign.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  );
};
