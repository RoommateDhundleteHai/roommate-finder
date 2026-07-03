/*
  Warnings:

  - You are about to drop the column `resultsReleaseAt` on the `MatchingCycle` table. All the data in the column will be lost.
  - You are about to drop the column `signupDeadline` on the `MatchingCycle` table. All the data in the column will be lost.
  - You are about to drop the column `dietaryPreference` on the `User` table. All the data in the column will be lost.
  - Made the column `domain` on table `College` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `endDate` to the `MatchingCycle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('SCALE', 'STRICT');

-- AlterEnum
ALTER TYPE "CycleStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "College" ALTER COLUMN "domain" SET NOT NULL;

-- AlterTable
ALTER TABLE "MatchingCycle" DROP COLUMN "resultsReleaseAt",
DROP COLUMN "signupDeadline",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "matchType" "MatchType" NOT NULL DEFAULT 'SCALE',
ADD COLUMN     "options" TEXT[],
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dietaryPreference",
ADD COLUMN     "adminStatus" "AdminStatus",
ADD COLUMN     "degree" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passingYear" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "Diet";

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Message_cycleId_idx" ON "Message"("cycleId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
