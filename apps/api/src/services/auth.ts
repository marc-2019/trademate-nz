/**
 * Authentication Service
 * User registration, login, and token management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import db from './database.js';
import { User, UserCreateInput, UserLoginInput, AuthTokens, JwtPayload } from '../types/index.js';
import { createError } from '../middleware/error.js';

const SALT_ROUNDS = 12;

/**
 * Register a new user
 */
export async function register(input: UserCreateInput): Promise<{ user: User; tokens: AuthTokens }> {
  // Check if user already exists
  const existingUser = await db.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [input.email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw createError('User with this email already exists', 409, 'USER_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user
  const result = await db.query<User>(
    `INSERT INTO users (id, email, password_hash, name, phone, trade_type, business_name, is_verified, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, true)
     RETURNING id, email, name, phone, trade_type as "tradeType", business_name as "businessName",
               is_verified as "isVerified", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
    [
      uuidv4(),
      input.email.toLowerCase(),
      passwordHash,
      input.name || null,
      input.phone || null,
      input.tradeType || null,
      input.businessName || null,
    ]
  );

  const user = result.rows[0];
  const tokens = generateTokens(user);

  // Store refresh token
  await storeRefreshToken(user.id, tokens.refreshToken);

  return { user, tokens };
}

/**
 * Login a user
 */
export async function login(input: UserLoginInput): Promise<{ user: User; tokens: AuthTokens }> {
  // Find user
  const result = await db.query<User & { password_hash: string }>(
    `SELECT id, email, password_hash, name, phone, trade_type as "tradeType",
            business_name as "businessName", is_verified as "isVerified",
            is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM users
     WHERE email = $1 AND is_active = true`,
    [input.email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const userWithHash = result.rows[0];

  // Verify password
  const isValid = await bcrypt.compare(input.password, userWithHash.password_hash);
  if (!isValid) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Remove password hash from user object
  const { password_hash: _, ...user } = userWithHash;

  const tokens = generateTokens(user as User);

  // Store refresh token
  await storeRefreshToken(user.id, tokens.refreshToken);

  return { user: user as User, tokens };
}

/**
 * Refresh access token
 */
export async function refreshToken(token: string): Promise<AuthTokens> {
  try {
    // Verify refresh token
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;

    // Check if token is stored and not revoked
    const result = await db.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM refresh_tokens
       WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      throw createError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Get user
    const userResult = await db.query<User>(
      `SELECT id, email, name, phone, trade_type as "tradeType",
              business_name as "businessName", is_verified as "isVerified",
              is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw createError('User not found', 401, 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    // Revoke old refresh token
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
      [token]
    );

    // Generate new tokens
    const tokens = generateTokens(user);

    // Store new refresh token
    await storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    throw error;
  }
}

/**
 * Logout user (revoke refresh token)
 */
export async function logout(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    // Revoke specific token
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token = $2',
      [userId, refreshToken]
    );
  } else {
    // Revoke all tokens for user
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await db.query<User>(
    `SELECT id, email, name, phone, trade_type as "tradeType",
            business_name as "businessName", is_verified as "isVerified",
            is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE id = $1 AND is_active = true`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'phone' | 'tradeType' | 'businessName'>>
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }
  if (updates.tradeType !== undefined) {
    fields.push(`trade_type = $${paramIndex++}`);
    values.push(updates.tradeType);
  }
  if (updates.businessName !== undefined) {
    fields.push(`business_name = $${paramIndex++}`);
    values.push(updates.businessName);
  }

  if (fields.length === 0) {
    return getUserById(userId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await db.query<User>(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${paramIndex} AND is_active = true
     RETURNING id, email, name, phone, trade_type as "tradeType",
               business_name as "businessName", is_verified as "isVerified",
               is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );

  return result.rows[0] || null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateTokens(user: User): AuthTokens {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessTokenExpiry,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTokenExpiry,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  // Calculate expiry (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), userId, token, expiresAt]
  );
}

export default {
  register,
  login,
  refreshToken,
  logout,
  getUserById,
  updateUser,
};
