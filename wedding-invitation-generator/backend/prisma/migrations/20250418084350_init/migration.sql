-- CreateTable
CREATE TABLE "CoupleInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groomName" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "weddingDate" DATETIME NOT NULL,
    "weddingTime" TEXT NOT NULL,
    "weddingLocation" TEXT NOT NULL,
    "weddingTheme" TEXT NOT NULL,
    "backgroundStory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "preferences" TEXT,
    "howMet" TEXT,
    "memories" TEXT,
    "status" TEXT NOT NULL,
    "invitationContent" TEXT,
    "coupleInfoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guest_coupleInfoId_fkey" FOREIGN KEY ("coupleInfoId") REFERENCES "CoupleInfo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "userIp" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
