const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateToken, formatUser } = require('../utils/helpers');
const { sendAdminWelcomeEmail } = require('../utils/email');

const prisma = new PrismaClient();

/**
 * POST /api/auth/signup
 * Register a new Admin account (public signup is Admin-only)
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // Send welcome email (non-blocking)
    try {
      await sendAdminWelcomeEmail({ name: user.name, email: user.email });
    } catch (emailError) {
      console.warn('Admin welcome email failed:', emailError.message);
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      data: {
        user: formatUser(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login with email and password
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: formatUser(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 */
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, getMe };
