/** API base URL with trailing slashes removed to avoid double slashes in paths. */
export const getApiDomain = () => (process.env.API_DOMAIN || '').replace(/\/+$/, '');

export const getRequestHeaders = (accessToken?: string) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  };
