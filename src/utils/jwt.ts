import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  userId: string;
  chatId: string;
}

/**
 * Generate JWT token untuk autentikasi /api/chat
 * @param userId - User identifier
 * @param chatId - Chat session identifier
 * @param expiresIn - Token expiration time (default: 7 days)
 * @returns JWT token string
 */
export function generateToken(
  userId: string, 
  chatId: string, 
  expiresIn: string = '7d'
): string {
  const payload: TokenPayload = {
    userId,
    chatId,
  };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('[JWT Verify Error]:', error);
    return null;
  }
}

// CLI utility untuk generate token saat development
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npm run token <userId> <chatId> [expiresIn]');
    console.log('Example: npm run token user123 chat456 7d');
    process.exit(1);
  }

  const [userId, chatId, expiresIn = '7d'] = args;
  const token = generateToken(userId, chatId, expiresIn);
  
  console.log('\n🔐 JWT Token Generated:\n');
  console.log(token);
  console.log('\n📋 Usage in API request:\n');
  console.log('Authorization: Bearer ' + token);
  console.log('\n✅ Token valid for:', expiresIn);
}
