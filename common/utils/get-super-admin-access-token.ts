import { getApiDomain, getRequestHeaders } from './api';

export async function getSuperAdminAccessToken() {
  const apiDomain = getApiDomain();
  const signInResponse = await fetch(`${apiDomain}/api/auth/basic/signin`, {
    method: 'POST',
    body: JSON.stringify({
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
    }),
    headers: getRequestHeaders(),
  });

  if (!signInResponse.ok) {
    throw new Error('Failed to login to super admin account');
  }

  const { refresh_token } = await signInResponse.json();

  const accessTokenResponse = await fetch(`${apiDomain}/api/auth/access_token`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      refresh_token,
    }),
  });

  if (!accessTokenResponse.ok) {
    throw new Error('Failed to get super admin access token');
  }

  const { access_token } = await accessTokenResponse.json();
  return access_token;
}
