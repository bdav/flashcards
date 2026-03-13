-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CardAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studySessionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userAnswer" TEXT,
    "result" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardAttempt_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardAttempt_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CardAttempt" ("cardId", "createdAt", "id", "result", "studySessionId", "userAnswer") SELECT "cardId", "createdAt", "id", "result", "studySessionId", "userAnswer" FROM "CardAttempt";
DROP TABLE "CardAttempt";
ALTER TABLE "new_CardAttempt" RENAME TO "CardAttempt";
CREATE INDEX "CardAttempt_studySessionId_idx" ON "CardAttempt"("studySessionId");
CREATE INDEX "CardAttempt_cardId_idx" ON "CardAttempt"("cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
