/**
 * Rotas de autenticação customizada (login por email/senha)
 * CORREÇÃO CRÍTICA: Login agora cria JWT cookie no servidor
 */
import { COOKIE_NAME, THIRTY_DAYS_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import * as db from "../db";
import { ENV } from "./env";
import crypto from "crypto";

interface AppUser {
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'user';
  openId: string;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateStableOpenId(email: string): string {
  return 'local_' + crypto.createHash('sha256').update(email).digest('hex').substring(0, 16);
}

const APP_USERS: AppUser[] = [
  {
    email: 'sarom@asxstore.com',
    passwordHash: hashPassword('Asxx@China'),
    name: 'Sarom',
    role: 'admin',
    openId: generateStableOpenId('sarom@asxstore.com'),
  },
  {
    email: 'alexandre@asx.com.br',
    passwordHash: hashPassword('China@2013'),
    name: 'Alexandre',
    role: 'user',
    openId: generateStableOpenId('alexandre@asx.com.br'),
  },
  {
    email: 'frederico@asx.com.br',
    passwordHash: hashPassword('China@2013'),
    name: 'Frederico',
    role: 'user',
    openId: generateStableOpenId('frederico@asx.com.br'),
  },
  {
    email: 'michaelfeng89@hotmail.com',
    passwordHash: hashPassword('China@2013'),
    name: 'Michael',
    role: 'user',
    openId: generateStableOpenId('michaelfeng89@hotmail.com'),
  },
];

function findUserByCredentials(email: string, password: string): AppUser | null {
  const hash = hashPassword(password);
  return APP_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hash
  ) ?? null;
}

export function registerCustomAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body ?? {};

      if (!email || !password) {
        res.status(400).json({ error: "Email e senha são obrigatórios" });
        return;
      }

      const appUser = findUserByCredentials(email, password);

      if (!appUser) {
        await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
        res.status(401).json({ error: "Email ou senha inválidos" });
        return;
      }

      await db.upsertUser({
        openId: appUser.openId,
        name: appUser.name,
        email: appUser.email,
        loginMethod: 'email',
        role: appUser.role,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(appUser.openId, {
        name: appUser.name,
        expiresInMs: THIRTY_DAYS_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: THIRTY_DAYS_MS,
      });

      console.log(`[Auth] Login bem-sucedido: ${appUser.name} (${appUser.email})`);

      res.json({
        success: true,
        user: {
          name: appUser.name,
          email: appUser.email,
          role: appUser.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Erro no login:", error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
