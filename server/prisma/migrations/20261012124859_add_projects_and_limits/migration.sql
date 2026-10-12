-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "className" TEXT;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gitUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "composePath" TEXT NOT NULL DEFAULT './docker-compose.yml',
    "dokployProjectId" TEXT NOT NULL,
    "composeId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "ProjectPort" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "containerPort" INTEGER NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'tcp',
    "hostPort" INTEGER NOT NULL,

    CONSTRAINT "ProjectPort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Limit" (
    "id" TEXT NOT NULL,
    "className" TEXT,
    "userId" TEXT,
    "maxProjects" INTEGER,
    "maxRunningProjects" INTEGER,
    "cpuLimit" DOUBLE PRECISION,
    "memoryMb" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_dokployProjectId_key" ON "Project"("dokployProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_composeId_key" ON "Project"("composeId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_appName_key" ON "Project"("appName");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPort_hostPort_key" ON "ProjectPort"("hostPort");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPort_projectId_serviceName_containerPort_protocol_key" ON "ProjectPort"("projectId", "serviceName", "containerPort", "protocol");

-- CreateIndex
CREATE UNIQUE INDEX "Limit_className_key" ON "Limit"("className");

-- CreateIndex
CREATE UNIQUE INDEX "Limit_userId_key" ON "Limit"("userId");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPort" ADD CONSTRAINT "ProjectPort_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limit" ADD CONSTRAINT "Limit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A limit row targets either a class or a student, never both.
ALTER TABLE "Limit" ADD CONSTRAINT "Limit_single_scope_check" CHECK ("className" IS NULL OR "userId" IS NULL);

-- Global default limits; the row must always exist and is only ever updated.
INSERT INTO "Limit" ("id", "maxProjects", "maxRunningProjects", "cpuLimit", "memoryMb", "updatedAt")
VALUES ('global', 3, 1, 0.5, 512, CURRENT_TIMESTAMP);
