import { promises as fs } from 'fs';
import path from 'path';
import clientPromise from './mongo.js';
import {
  MemoFiche,
  MemoFicheSection,
  MemoFicheSectionContent,
} from '../types.js';

const OUTPUT_FILE = path.join(process.cwd(), 'pharmia_knowledge_base.md');
const DOCS_FILE = path.join(process.cwd(), 'memofiches_documentation.md');

// Helper to format a section content array (text/image/video) -> Markdown
function formatSectionContent(content: MemoFicheSectionContent[]): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => {
      if (item.type === 'text') return item.value;
      if (item.type === 'image') return `![Image](${item.value})`; // We might want to omit images for pure text KB, but keeping alt/url is okay.
      if (item.type === 'video') return `[Video](${item.value})`;
      return '';
    })
    .join('\n\n');
}

// Helper to handle string | MemoFicheSection
function formatRichField(
  field: string | MemoFicheSection | undefined,
  titleFallback: string,
): string {
  if (!field) return '';

  let content = '';
  if (typeof field === 'string') {
    content = field;
  } else if (field && typeof field === 'object' && field.content) {
    content = formatSectionContent(field.content);
  }

  if (!content) return '';
  return `### ${titleFallback}\n\n${content}\n\n`;
}

function formatListField(list: string[] | undefined, title: string): string {
  if (!list || list.length === 0) return '';
  return `### ${title}\n\n${list.map((item) => `- ${item}`).join('\n')}\n\n`;
}

function formatMemoFiche(fiche: MemoFiche): string {
  let md = `# ${fiche.title}\n\n`;

  // Metadata
  md += `**Type:** ${fiche.type || 'N/A'} | **Thème:** ${fiche.theme || 'N/A'} | **Système:** ${fiche.system || 'N/A'} | **Niveau:** ${fiche.level || 'N/A'}\n\n`;

  if (fiche.shortDescription) {
    md += `> ${fiche.shortDescription}\n\n`;
  }

  // --- Generic / Standard Fields ---
  md += formatRichField(
    fiche.patientSituation,
    'Situation Patient / Cas Comptoir',
  );
  md += formatRichField(fiche.pathologyOverview, 'Aperçu Pathologie');

  md += formatListField(fiche.keyQuestions, 'Questions Clés');
  md += formatListField(fiche.redFlags, "Signaux d'Alerte (Red Flags)");

  // Treatments & Advice (Standard)
  md += formatListField(fiche.mainTreatment, 'Traitement Principal');
  md += formatListField(fiche.associatedProducts, 'Produits Associés');
  md += formatListField(fiche.lifestyleAdvice, 'Conseils Hygiène de Vie');
  md += formatListField(fiche.dietaryAdvice, 'Conseils Alimentaires');

  // Recommendations Object (Legacy/Alternative structure)
  if (fiche.recommendations) {
    md += formatListField(
      fiche.recommendations.mainTreatment,
      'Traitement Principal (Rec)',
    );
    md += formatListField(
      fiche.recommendations.associatedProducts,
      'Produits Associés (Rec)',
    );
    md += formatListField(
      fiche.recommendations.lifestyleAdvice,
      'Conseils Hygiène de Vie (Rec)',
    );
    md += formatListField(
      fiche.recommendations.dietaryAdvice,
      'Conseils Alimentaires (Rec)',
    );
  }

  // --- Sections (Dynamic) ---
  if (fiche.sections && fiche.sections.length > 0) {
    fiche.sections.forEach((section) => {
      md += `### ${section.title}\n\n${formatSectionContent(section.content)}\n\n`;
    });
  }

  // --- Custom Sections ---
  if (fiche.customSections && fiche.customSections.length > 0) {
    fiche.customSections.forEach((section) => {
      md += `### ${section.title} (Custom)\n\n${formatSectionContent(section.content)}\n\n`;
    });
  }

  // --- DM Specifics ---
  md += formatRichField(fiche.casComptoir, 'Cas Comptoir (DM)');
  md += formatRichField(fiche.objectifsConseil, 'Objectifs Conseil');
  md += formatRichField(fiche.pathologiesConcernees, 'Pathologies Concernées');
  md += formatRichField(fiche.interetDispositif, 'Intérêt du Dispositif');
  md += formatRichField(fiche.beneficesSante, 'Bénéfices Santé');
  md += formatRichField(
    fiche.dispositifsAConseiller,
    'Dispositifs à Conseiller',
  );
  md += formatRichField(fiche.reponsesObjections, 'Réponses aux Objections');

  // --- Ordonnances Specifics ---
  md += formatListField(fiche.ordonnance, 'Ordonnance');
  md += formatListField(fiche.analyseOrdonnance, "Analyse de l'Ordonnance");

  if (fiche.conseilsTraitement) {
    md += `### Conseils Traitement\n\n`;
    if (Array.isArray(fiche.conseilsTraitement)) {
      // Check if it's string[] or object[]
      if (typeof fiche.conseilsTraitement[0] === 'string') {
        md += (fiche.conseilsTraitement as string[])
          .map((t) => `- ${t}`)
          .join('\n');
      } else {
        (fiche.conseilsTraitement as any[]).forEach((item: any) => {
          md += `**${item.medicament}**:\n${item.conseils.map((c: string) => `- ${c}`).join('\n')}\n`;
        });
      }
    }
    md += '\n\n';
  }

  md += formatListField(fiche.keyPoints, 'Points Clés à Retenir');

  // Flashcards (useful for Q&A generation)
  if (fiche.flashcards && fiche.flashcards.length > 0) {
    md += `### Flashcards (Révision)\n\n`;
    fiche.flashcards.forEach((fc) => {
      md += `- Q: ${fc.question}\n  R: ${fc.answer}\n`;
    });
    md += '\n';
  }

  md += `---\n\n`; // Separator
  return md;
}

export async function generateKnowledgeBase() {
  console.log('Starting Knowledge Base generation...');

  try {
    // 1. Read Documentation/Rules
    console.log('Reading documentation rules...');
    let fullContent = '';
    try {
      fullContent = await fs.readFile(DOCS_FILE, 'utf-8');
      fullContent +=
        "\n\n# BASE DE CONNAISSANCE DES MÉMOFICHES PHARMIA\n\nCe document contient l'ensemble des fiches validées. Utilisez ces informations pour répondre aux questions.\n\n---\n\n";
    } catch (e) {
      console.warn('Warning: Could not read memofiches_documentation.md', e);
      fullContent = '# BASE DE CONNAISSANCE PHARMIA\n\n';
    }

    // 2. Fetch from Mongo
    console.log('Fetching MemoFiches from MongoDB...');
    const client = await clientPromise;
    const db = client.db('pharmia');
    const memofiches = await db
      .collection<MemoFiche>('memofiches')
      .find({})
      .toArray();

    console.log(`Found ${memofiches.length} MemoFiches.`);

    // 3. Convert to Markdown
    let successCount = 0;
    for (const fiche of memofiches) {
      try {
        // Only process Published fiches? Or all? User said "base de connaissance", usually implies valid info.
        // Let's include everything for now, maybe filter by status if requested later.
        // if (fiche.status !== 'Published') continue;

        fullContent += formatMemoFiche(fiche);
        successCount++;
      } catch (err) {
        console.error(`Error formatting fiche ${fiche.title}:`, err);
      }
    }

    // 4. Write to file
    await fs.writeFile(OUTPUT_FILE, fullContent, 'utf-8');

    console.log(`Knowledge Base successfully generated at ${OUTPUT_FILE}`);
    console.log(`Total fiches processed: ${successCount}`);

    return OUTPUT_FILE;
  } catch (error) {
    console.error('Fatal error generating knowledge base:', error);
    throw error;
  }
}

import { fileURLToPath } from 'url';

// Allow running directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateKnowledgeBase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
