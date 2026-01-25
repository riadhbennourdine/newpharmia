const normalizeText = (text: string): string => {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
};

const lineFromDB =
  '**Topiques locaux** Crèmes, pommades, suppositoires anti-hémorroïdaires:';
const normalizedLine = normalizeText(lineFromDB);

const keywordsFromDB = [
  'Hémorroïde',
  'Hémorroïdes',
  'antihémorroïdaires',
  'antih-émorroïdaires',
  'hémorroïdaire',
  'hémorroïdaires',
  'hémorroidaire',
  'hémorroidaires',
];

console.log(`Line from DB: "${lineFromDB}"`);
console.log(`Normalized Line: "${normalizedLine}"`);

keywordsFromDB.forEach((keyword) => {
  const normalizedKeyword = normalizeText(keyword);
  const isMatch = normalizedLine.includes(normalizedKeyword);
  console.log(
    `Keyword: "${keyword}" 	-> Normalized: "${normalizedKeyword}" 	-> Match: ${isMatch}`,
  );
});
