import { prisma } from "./db.server";
import type { Session } from "@prisma/client";

export async function getSession(id: string) {
  return prisma.session.findUnique({
    where: { id },
  });
}

export async function createSession(data: Omit<Session, "createdAt" | "updatedAt">) {
  return prisma.session.create({
    data,
  });
}

export async function updateSession(id: string, data: Partial<Session>) {
  return prisma.session.update({
    where: { id },
    data,
  });
}

export async function deleteSession(id: string) {
  return prisma.session.delete({
    where: { id },
  });
} 