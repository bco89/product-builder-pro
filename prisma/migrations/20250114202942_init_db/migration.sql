-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(255) NOT NULL,
    `shop` VARCHAR(255) NOT NULL,
    `state` VARCHAR(255) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` TEXT NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` TEXT NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(255) NULL,
    `lastName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(50) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Session_shop_idx`(`shop`),
    INDEX `Session_expires_idx`(`expires`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductDraft` (
    `id` VARCHAR(36) NOT NULL,
    `shop` VARCHAR(255) NOT NULL,
    `sessionId` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `vendor` VARCHAR(255) NOT NULL,
    `productType` VARCHAR(255) NOT NULL,
    `tags` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `variants` TEXT NULL,
    `images` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,

    INDEX `ProductDraft_shop_idx`(`shop`),
    INDEX `ProductDraft_sessionId_idx`(`sessionId`),
    INDEX `ProductDraft_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreCache` (
    `id` VARCHAR(36) NOT NULL,
    `shop` VARCHAR(255) NOT NULL,
    `dataType` VARCHAR(50) NOT NULL,
    `data` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `StoreCache_shop_idx`(`shop`),
    INDEX `StoreCache_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `StoreCache_shop_dataType_key`(`shop`, `dataType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductDraft` ADD CONSTRAINT `ProductDraft_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
