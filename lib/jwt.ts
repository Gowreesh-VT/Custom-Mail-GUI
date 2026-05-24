import jwt from "jsonwebtoken";

export type TokenType = "access" | "refresh";
export interface JwtPayload {
  userId: string;
  email: string;
  role?: "admin" | "user";
  forcePasswordReset?: boolean;
  type: TokenType;
}

function secretFor(type: TokenType) {
  const value = type === "access" ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
  if (!value) throw new Error(`JWT_${type.toUpperCase()}_SECRET is not configured`);
  return value;
}

export function signToken(payload: Omit<JwtPayload, "type">, type: TokenType) {
  return jwt.sign({ ...payload, type }, secretFor(type), {
    expiresIn: type === "access" ? "15m" : "7d"
  });
}

export function verifyToken(token: string, type: TokenType): JwtPayload {
  const decoded = jwt.verify(token, secretFor(type)) as JwtPayload;
  if (decoded.type !== type) throw new Error("Invalid token type");
  return decoded;
}
