import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import clientPromise from '../mongo.js';
import { User, UserRole } from '../../types.js';
import { sendSingleEmail } from '../emailService.js';
import { authenticateToken, AuthenticatedRequest } from '../authMiddleware.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "L'identifiant et le mot de passe sont requis." });
    }

    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (isMatch) {
        // Check if subscription is still active
        if (
          user.subscriptionEndDate &&
          new Date(user.subscriptionEndDate) < new Date()
        ) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { hasActiveSubscription: false } },
          );
          user.hasActiveSubscription = false;
        }

        // Passwords match, generate a real JWT
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET as string,
          { expiresIn: '7d' },
        );
        res.json({ token, user });
      } else {
        // Passwords do not match
        res.status(401).json({ message: 'Identifiants invalides.' });
      }
    } else {
      // User not found
      res.status(401).json({ message: 'Identifiants invalides.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      role,
      pharmacistId,
      firstName,
      lastName,
      city,
      phoneNumber,
    } = req.body;

    // Basic validation
    if (!email || !username || !password || !role || !firstName || !lastName) {
      return res
        .status(400)
        .json({ message: 'Veuillez remplir tous les champs obligatoires.' });
    }

    // Security check: Only allow public roles registration
    const allowedRoles = [UserRole.PHARMACIEN, UserRole.PREPARATEUR];
    if (!allowedRoles.includes(role)) {
      return res
        .status(403)
        .json({ message: 'Inscription non autorisée pour ce rôle.' });
    }

    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res
        .status(409)
        .json({
          message:
            "Un utilisateur avec cet email ou nom d'utilisateur existe déjà.",
        });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUserDocument = {
      email,
      username,
      passwordHash,
      role,
      pharmacistId:
        role === UserRole.PREPARATEUR && pharmacistId
          ? new ObjectId(pharmacistId)
          : undefined,
      firstName,
      lastName,
      city,
      phoneNumber, // Added phoneNumber
      createdAt: new Date(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      hasActiveSubscription: false,
      profileIncomplete: false,
    };

    const result = await usersCollection.insertOne(newUserDocument as User);

    if (result.acknowledged) {
      res
        .status(201)
        .json({
          message:
            'Inscription réussie. Vous pouvez maintenant vous connecter.',
        });
    } else {
      res
        .status(500)
        .json({ message: "Échec de la création de l'utilisateur." });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "L'identifiant est requis." });
    }

    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      // Send a generic message to prevent email enumeration
      return res.json({
        message:
          'Si un compte existe, un email de réinitialisation a été envoyé.',
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpires,
        },
      },
    );

    // Send email with reset link
    const resetUrl = `${process.env.CLIENT_URL}#/reset-password?token=${resetToken}`;
    const htmlContent = `
            <p>Vous avez demandé une réinitialisation de mot de passe.</p>
            <p>Veuillez cliquer sur ce lien pour réinitialiser votre mot de passe : <a href="${resetUrl}">${resetUrl}</a></p>
            <p>Ce lien expirera dans une heure.</p>
            <p>Si vous n'avez pas demandé cela, veuillez ignorer cet e-mail.</p>
        `;

    console.log(`[DEBUG] BREVO_API_KEY is ${process.env.BREVO_API_KEY ? 'set' : 'not set'}`);
    await sendSingleEmail({
      to: user.email,
      subject: 'Réinitialisation de mot de passe PharmIA',
      htmlContent,
    });

    res.json({
      message:
        'Si un compte existe, un email de réinitialisation a été envoyé.',
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR] Failed to send reset email:', error);
    res
      .status(500)
      .json({
        message:
          "Le serveur a rencontré un problème lors de l'envoi de l'email de réinitialisation. Veuillez contacter l'administrateur. Le problème est probablement lié à la configuration du service d'email.",
      });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Le jeton et le nouveau mot de passe sont requis.' });
    }

    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      return res
        .status(400)
        .json({
          message: 'Le jeton de réinitialisation est invalide ou a expiré.',
        });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        },
      },
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res
      .status(500)
      .json({
        message:
          'Erreur interne du serveur lors de la réinitialisation du mot de passe.',
      });
  }
});

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404).json({ message: 'User not found.' });
  }
});

export default router;
