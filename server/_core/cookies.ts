import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  // CORREÇÃO CRÍTICA: NÃO definir domain no cookie.
  // Quando domain é omitido, o navegador usa automaticamente o domínio da URL atual.
  // Isso resolve o problema onde req.hostname retorna o domínio interno do Cloud Run
  // (ex: qvplmmueng-nf24tux2iq-uk.a.run.app) em vez do domínio customizado (customsasx.online).
  // Com domain omitido, o cookie funciona corretamente em qualquer domínio.

  return {
    // domain omitido intencionalmente - navegador usa o domínio da URL automaticamente
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
