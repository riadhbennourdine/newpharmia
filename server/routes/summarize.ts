import express from 'express';
import { authenticateToken, checkRole } from '../authMiddleware.js';
import { summarizeText } from '../geminiService.js';
import { UserRole } from '../../types.js';

const router = express.Router();

router.post('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Le texte à résumer est requis.' });
    }

    try {
        const summary = await summarizeText(text);
        res.json({ summary });
    } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la génération du résumé.', error: error.message });
    }
});

export default router;
