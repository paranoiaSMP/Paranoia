import { PrismaClient } from '@prisma/client'
import { Pool, types } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Fix for BigInt serialization
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () { return Number(this) }
}
types.setTypeParser(20, val => parseInt(val, 10))

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

let connectionString = process.env.DATABASE_URL || ''

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({ 
    connectionString,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 10000, // Reduced to prevent using connections closed by remote DB
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  })

  globalForPrisma.pool.on('error', (err) => {
    // Suppress idle client errors so they don't crash the server
    console.error('Unexpected error on idle database client', err)
  })
}

const adapter = new PrismaPg(globalForPrisma.pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}