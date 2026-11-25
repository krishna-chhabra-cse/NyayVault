import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nyayvault-dev-only-insecure-secret';

// Login route
router.post('/login', async (req, res) => {
  const { badge_number, password } = req.body;
  
  if (!badge_number || !password) {
    return res.status(400).json({ error: 'Badge number and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE badge_number = $1', [badge_number]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid badge number or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid badge number or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, badge_number: user.badge_number, role: user.role, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Don't send password hash back
    delete user.password_hash;

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get current user (Verify Token)
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const result = await query('SELECT id, badge_number, full_name, role, department FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// Keep old users route for backward compatibility if needed, or for auth context
router.get('/users', async (req, res, next) => {
  try {
    const result = await query('SELECT id, badge_number, full_name, role, department FROM users ORDER BY full_name ASC;');
    res.json({
      success: true,
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
