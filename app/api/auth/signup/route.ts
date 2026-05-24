import { jsonError } from "@/lib/utils";

/*
Public signup is disabled. Admins create users from /admin/users.

Previous implementation created a user from public name/email/password input
and issued auth cookies immediately.
*/

export async function POST() {
  return jsonError("Signup is disabled. Contact your administrator.", 403, "SIGNUP_DISABLED");
}
