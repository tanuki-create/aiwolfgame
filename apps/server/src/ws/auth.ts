/**
 * Simple JWT-like token generation (for development)
 * In production, use proper JWT library
 */
export function generateToken(payload: Record<string, any>): string {
  const data = JSON.stringify(payload);
  return Buffer.from(data).toString('base64');
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): Record<string, any> | null {
  try {
    const data = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Generate user token for room access
 */
export function generateUserToken(userId: string, roomId: string, playerName: string): string {
  return generateToken({
    userId,
    roomId,
    playerName,
    isAdmin: false,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Generate admin token
 */
export function generateAdminToken(adminId: string): string {
  return generateToken({
    userId: adminId,
    isAdmin: true,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });
}

/**
 * Validate token
 */
export function validateToken(token: string): { valid: boolean; payload?: any } {
  const payload = verifyToken(token);
  
  if (!payload) {
    return { valid: false };
  }

  // Check expiration
  if (payload.exp && payload.exp < Date.now()) {
    return { valid: false };
  }

  return { valid: true, payload };
}

