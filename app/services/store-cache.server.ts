import { prisma } from "./db.server";
import type { StoreCache } from "@prisma/client";

export async function getCacheEntry(shop: string, dataType: string) {
  return prisma.storeCache.findUnique({
    where: {
      shop_dataType: {
        shop,
        dataType,
      },
    },
  });
}

export async function setCacheEntry(
  shop: string,
  dataType: string,
  data: string,
  expiresAt: Date
) {
  return prisma.storeCache.upsert({
    where: {
      shop_dataType: {
        shop,
        dataType,
      },
    },
    update: {
      data,
      expiresAt,
    },
    create: {
      shop,
      dataType,
      data,
      expiresAt,
    },
  });
} 