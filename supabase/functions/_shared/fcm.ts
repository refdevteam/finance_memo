// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
// Shared FCM helper used by all Edge Functions that need to send push notifications.

/**
 * Generates a short-lived OAuth 2.0 access token from a Firebase Service Account JSON.
 * The token is used to call the FCM HTTP v1 API.
 * 
 * Required env var: FIREBASE_SERVICE_ACCOUNT (the full JSON content of the service account key)
 */
export async function getFcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const email = serviceAccount.client_email;
  const privateKeyPem = serviceAccount.private_key;

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const stringToSign = `${encode(header)}.${encode(claimSet)}`;
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(stringToSign)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${stringToSign}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[FCM] Failed to get OAuth token: ${response.statusText} — ${errorBody}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

export interface FcmPayload {
  fcmToken: string;
  title: string;
  body: string;
  /** Optional action URL to open when notification is clicked */
  actionUrl?: string;
  /** Extra data fields forwarded to the service worker */
  data?: Record<string, string>;
  /** Icon path (default: /logo-circle.png) */
  icon?: string;
}

/**
 * Sends a single push notification via FCM HTTP v1 API.
 * All data values must be strings (FCM requirement).
 */
export async function sendFcmPush(
  accessToken: string,
  projectId: string,
  payload: FcmPayload
): Promise<void> {
  const { fcmToken, title, body, actionUrl, data = {}, icon = "/logo-circle.png" } = payload;

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        data: {
          action_url: actionUrl ?? "/dashboard",
          ...data,
        },
        webpush: {
          headers: { Urgency: "high" },
          notification: {
            title,
            body,
            icon,
            badge: "/icon-192.png",
            click_action: actionUrl ?? "/dashboard",
          },
          fcm_options: {
            link: actionUrl ?? "/dashboard",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[FCM] Send failed (${response.status}): ${errText}`);
  }
}

/**
 * Initializes FCM from the FIREBASE_SERVICE_ACCOUNT environment secret.
 * Returns null if the secret is missing (falls back to simulation mode).
 */
export async function initFcm(): Promise<{
  accessToken: string;
  projectId: string;
} | null> {
  const fcmServiceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!fcmServiceAccountStr) {
    console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT secret not set — FCM push disabled.");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fcmServiceAccountStr);
    const projectId: string = serviceAccount.project_id;
    const accessToken = await getFcmAccessToken(serviceAccount);
    console.log(`[FCM] Initialized. Project: ${projectId}`);
    return { accessToken, projectId };
  } catch (err) {
    console.error("[FCM] Failed to initialize:", err);
    return null;
  }
}
