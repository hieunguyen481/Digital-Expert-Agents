import Keycloak, { type KeycloakTokenParsed } from 'keycloak-js';

const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

let keycloak: Keycloak | null = null;

function getKeycloak(): Keycloak {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
      realm: import.meta.env.VITE_KEYCLOAK_REALM || 'bank-ai',
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'bank-ai-frontend',
    });
  }
  return keycloak;
}

/**
 * Khởi tạo Authorization Code + PKCE ở chế độ check-sso: chỉ KIỂM TRA phiên,
 * không ép chuyển hướng. Người chưa đăng nhập được RequireAuth đưa về /login.
 */
export async function initializeAuthentication(): Promise<void> {
  if (useMockApi) return;

  const client = getKeycloak();
  await client.init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });
}

/** Mock mode luôn coi là đã đăng nhập để demo giao diện không cần Keycloak. */
export function isAuthenticated(): boolean {
  if (useMockApi) return true;
  return keycloak?.authenticated === true;
}

/** Chuyển hướng sang Keycloak; sau khi đăng nhập quay lại đúng trang yêu cầu. */
export async function login(returnTo = '/'): Promise<void> {
  const client = getKeycloak();
  await client.login({ redirectUri: `${window.location.origin}${returnTo}` });
}

/** Đưa người dùng về /login kèm đường quay lại (dùng khi phiên không làm mới được). */
export function redirectToLogin(): void {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?returnTo=${returnTo}`);
}

/**
 * Trả token ngắn hạn trong bộ nhớ (không ghi vào storage). Tự làm mới khi sắp hết hạn;
 * làm mới lỗi (phiên Keycloak đã mất) thì chuyển về /login giữ đường quay lại.
 * `force` buộc làm mới dù token còn hạn (dùng khi backend trả 401).
 */
export async function getValidAccessToken(force = false): Promise<string | null> {
  if (useMockApi) return null;

  const client = getKeycloak();
  if (!client.authenticated) return null;
  try {
    await client.updateToken(force ? -1 : 30);
  } catch {
    redirectToLogin();
    throw new Error('Phiên đăng nhập đã hết hạn. Đang chuyển về trang đăng nhập.');
  }
  return client.token ?? null;
}

export function getAuthenticatedClaims(): KeycloakTokenParsed | undefined {
  return keycloak?.tokenParsed;
}

export async function logout(): Promise<void> {
  if (!keycloak) return;
  await keycloak.logout({ redirectUri: `${window.location.origin}/login` });
}
