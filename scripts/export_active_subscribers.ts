import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://mongo:YoEfFXGVQwTTQlnwwPYRKwdIrgEqXrNp@centerbeam.proxy.rlwy.net:33803';
const DB_NAME = 'pharmia';

const OUTPUT_DIR = path.resolve(__dirname, '../exports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    // Handle local files (if they start with /uploads)
    if (url.startsWith('/uploads')) {
      const localPath = path.resolve(__dirname, '../public', url.substring(1));
      if (fs.existsSync(localPath)) {
        fs.copyFileSync(localPath, dest);
        return true;
      }
      // Try looking in the volume mount path if not found in public
      const volumePath = path.resolve(
        '/data/uploads',
        url.replace('/uploads/', ''),
      );
      if (fs.existsSync(volumePath)) {
        fs.copyFileSync(volumePath, dest);
        return true;
      }
      return false;
    }

    // Handle remote URLs
    const response = await fetch(url);
    if (!response.ok) return false;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return false;
  }
}

async function exportActiveSubscribers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    const ordersCollection = db.collection('orders');

    // Create a specific folder for this export with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFolder = path.join(
      OUTPUT_DIR,
      `active_subscribers_${timestamp}`,
    );
    const proofsFolder = path.join(exportFolder, 'justificatifs');

    fs.mkdirSync(exportFolder, { recursive: true });
    fs.mkdirSync(proofsFolder, { recursive: true });

    // Fetch active pharmacists
    const pharmacists = await usersCollection
      .find({
        role: 'PHARMACIEN',
        hasActiveSubscription: true,
      })
      .toArray();

    console.log(`Found ${pharmacists.length} active pharmacists.`);

    const csvRows = [];
    // Header row
    csvRows.push([
      'ID',
      'Nom',
      'Prénom',
      'Email',
      'Ville',
      'Téléphone',
      'Formule',
      'Date Début',
      'Date Fin',
      'Dernière Commande',
      'Montant',
      'Preuve Paiement',
    ]);

    for (const user of pharmacists) {
      console.log(`Processing ${user.firstName} ${user.lastName}...`);

      // Find the latest confirmed order for this user
      // We look for orders that might have triggered the subscription
      const lastOrder = await ordersCollection.findOne(
        { userId: user._id, status: 'CONFIRMED' },
        { sort: { createdAt: -1 } },
      );

      let proofFilename = 'Aucune preuve';

      if (lastOrder && lastOrder.paymentProofUrl) {
        const extension = path.extname(lastOrder.paymentProofUrl) || '.jpg';
        const safeName =
          `${user.lastName || 'Inconnu'}_${user.firstName || 'Inconnu'}_${lastOrder._id}${extension}`.replace(
            /[^a-z0-9._-]/gi,
            '_',
          );
        const destPath = path.join(proofsFolder, safeName);

        const downloaded = await downloadFile(
          lastOrder.paymentProofUrl,
          destPath,
        );
        if (downloaded) {
          proofFilename = safeName;
        } else {
          proofFilename = 'Erreur téléchargement';
        }
      } else if (lastOrder && !lastOrder.paymentProofUrl) {
        proofFilename = 'Paiement en ligne (GPG/Konnect) ou sans preuve';
      }

      const formatDate = (d: Date | string | undefined) =>
        d ? new Date(d).toLocaleDateString('fr-FR') : 'N/A';

      csvRows.push([
        user._id.toString(),
        `"${user.lastName || ''}"`,
        `"${user.firstName || ''}"`,
        user.email,
        `"${user.city || ''}"`,
        `"${user.phoneNumber || ''}"`,
        user.planName || 'N/A',
        formatDate(user.subscriptionStartDate),
        formatDate(user.subscriptionEndDate),
        lastOrder ? lastOrder._id.toString() : 'Aucune commande confirmée',
        lastOrder ? `${lastOrder.totalAmount} TND` : '0',
        proofFilename,
      ]);
    }

    // Write CSV
    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    fs.writeFileSync(path.join(exportFolder, 'liste_abonnés.csv'), csvContent);

    console.log(`Export completed successfully!`);
    console.log(`Files are located in: ${exportFolder}`);
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    await client.close();
  }
}

exportActiveSubscribers();
