// Ed25519 signatures over skill artifacts. A signature proves the manifest + evaluation report were
// produced by this installation and not modified since — it says nothing about whether a skill is safe.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.ts";
import { canonical } from "./policy.ts";

let cached: { priv: crypto.KeyObject; pub: crypto.KeyObject } | null = null;

function keys() {
  if (cached) return cached;
  const file = getConfig().signingKeyPath;
  let priv: crypto.KeyObject;
  if (fs.existsSync(file)) {
    priv = crypto.createPrivateKey(fs.readFileSync(file));
  } else {
    priv = crypto.generateKeyPairSync("ed25519").privateKey;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, priv.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  }
  cached = { priv, pub: crypto.createPublicKey(priv) };
  return cached;
}

export const publicKeyPem = () => keys().pub.export({ type: "spki", format: "pem" }).toString();

/** The exact bytes that are signed. */
export function signedPayload(manifest: unknown, evaluationReport: unknown): string {
  const reportHash = crypto.createHash("sha256").update(canonical(evaluationReport)).digest("hex");
  return canonical({ artifact: "noctua.skill/v1", manifest, evaluationReportSha256: reportHash });
}

export function sign(manifest: unknown, report: unknown): string {
  return crypto.sign(null, Buffer.from(signedPayload(manifest, report)), keys().priv).toString("base64");
}

export function verify(manifest: unknown, report: unknown, signature: string | null): boolean {
  if (!signature) return false;
  try {
    return crypto.verify(null, Buffer.from(signedPayload(manifest, report)), keys().pub, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

/** Tests only. */
export function resetKeys() {
  cached = null;
}
