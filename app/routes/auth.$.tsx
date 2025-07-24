import { authenticateAdmin } from "../services/auth.server";

export const loader = async ({ request }) => {
  await authenticateAdmin(request);
  return null;
};
