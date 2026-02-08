-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'FORWARDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "circleUserId" TEXT,
    "circleWalletId" TEXT,
    "circleWalletAddress" TEXT,
    "gifUrl" TEXT,
    "voiceName" TEXT NOT NULL DEFAULT 'Google US English',
    "voiceRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "voicePitch" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "minDonation" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "donorAddress" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "sourceChain" TEXT NOT NULL,
    "sourceTxHash" TEXT NOT NULL,
    "forwardTxHash" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_sourceTxHash_key" ON "Donation"("sourceTxHash");

-- CreateIndex
CREATE INDEX "Donation_streamerId_createdAt_idx" ON "Donation"("streamerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
