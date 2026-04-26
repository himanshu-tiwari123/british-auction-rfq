-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "ExtensionTrigger" AS ENUM ('BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_RANK_CHANGE');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPPLIER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" SERIAL NOT NULL,
    "referenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "bidStartTime" TIMESTAMP(3) NOT NULL,
    "bidCloseTime" TIMESTAMP(3) NOT NULL,
    "forcedBidCloseTime" TIMESTAMP(3) NOT NULL,
    "triggerWindowMins" INTEGER NOT NULL,
    "extensionDurationMins" INTEGER NOT NULL,
    "extensionTrigger" "ExtensionTrigger" NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerId" INTEGER NOT NULL,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" SERIAL NOT NULL,
    "rfqId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "carrierName" TEXT NOT NULL,
    "freightCharges" DOUBLE PRECISION NOT NULL,
    "originCharges" DOUBLE PRECISION NOT NULL,
    "destinationCharges" DOUBLE PRECISION NOT NULL,
    "totalCharges" DOUBLE PRECISION NOT NULL,
    "transitTimeDays" INTEGER NOT NULL,
    "quoteValidity" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionExtensionLog" (
    "id" SERIAL NOT NULL,
    "rfqId" INTEGER NOT NULL,
    "previousClose" TIMESTAMP(3) NOT NULL,
    "newClose" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionExtensionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_referenceId_key" ON "Rfq"("referenceId");

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionExtensionLog" ADD CONSTRAINT "AuctionExtensionLog_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
