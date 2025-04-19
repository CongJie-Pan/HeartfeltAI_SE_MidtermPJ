-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guest" (
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
    CONSTRAINT "Guest_coupleInfoId_fkey" FOREIGN KEY ("coupleInfoId") REFERENCES "CoupleInfo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Guest" ("coupleInfoId", "createdAt", "email", "howMet", "id", "invitationContent", "memories", "name", "preferences", "relationship", "status", "updatedAt") SELECT "coupleInfoId", "createdAt", "email", "howMet", "id", "invitationContent", "memories", "name", "preferences", "relationship", "status", "updatedAt" FROM "Guest";
DROP TABLE "Guest";
ALTER TABLE "new_Guest" RENAME TO "Guest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
