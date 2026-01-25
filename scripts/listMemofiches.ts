import fetch from 'node-fetch';
import 'dotenv/config';
import * as fs from 'fs'; // Import fs module
import * as path from 'path'; // Import path module

const API_BASE_URL = `http://localhost:${process.env.PORT || 3001}/api`;
const BASE_FRONTEND_URL = 'https://newpharmia-production.up.railway.app';
const OUTPUT_FILENAME = 'memofiches_list.md';

async function listAllMemofiches() {
  let allFiches: any[] = [];
  let currentPage = 1;
  let totalPages = 1;

  try {
    console.log(
      `Starting to fetch all memofiches from ${API_BASE_URL}/memofiches`,
    );

    while (currentPage <= totalPages) {
      console.log(`Fetching page ${currentPage}...`);
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(currentPage));
      queryParams.append('limit', '100'); // Fetch more per page to reduce requests if many fiches

      const response = await fetch(
        `${API_BASE_URL}/memofiches?${queryParams.toString()}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch memofiches page ${currentPage}: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      allFiches = allFiches.concat(data.data);
      totalPages = data.pagination.totalPages;
      currentPage++;
    }

    if (allFiches.length === 0) {
      console.log('No memofiches found.');
      return;
    }

    // Generate Markdown content
    let markdownContent = `# Liste des Mémofiches Disponibles\n\n`;
    markdownContent += `Total: ${allFiches.length} mémofiches\n\n`;

    allFiches.forEach((fiche: any) => {
      const link = `${BASE_FRONTEND_URL}/#/memofiche/${fiche._id}`;
      markdownContent += `## ${fiche.title}\n`;
      markdownContent += `- **Lien:** [${link}](${link})\n`;
      markdownContent += `- **ID:** 
${fiche._id}
`;
      markdownContent += `- **Description courte:** ${fiche.shortDescription || 'N/A'}\n`;
      markdownContent += `- **Thème:** ${fiche.theme || 'N/A'}\n`;
      markdownContent += `- **Système:** ${fiche.system || 'N/A'}\n\n`;
    });

    // Write to Markdown file
    const outputPath = path.join(process.cwd(), OUTPUT_FILENAME);
    fs.writeFileSync(outputPath, markdownContent, 'utf8');
    console.log(
      `\nSuccessfully generated "${OUTPUT_FILENAME}" at ${outputPath}`,
    );
  } catch (error: any) {
    console.error('Error listing all memofiches:', error.message);
  }
}

listAllMemofiches();
