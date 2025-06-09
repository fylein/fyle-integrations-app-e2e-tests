import { getSuperAdminAccessToken } from './common/utils/get-super-admin-access-token';

async function globalSetup() {
  process.env.SUPER_ADMIN_ACCESS_TOKEN = await getSuperAdminAccessToken();
}

export default globalSetup;
