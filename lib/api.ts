import { type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { User } from "@/models/User";

export async function requireUser(req: NextRequest) {
  await connectToDatabase();
  const payload = getUserFromRequest(req);
  const user = await User.findById(payload.userId);
  if (!user) throw new Error("User not found");
  return { payload, user };
}
