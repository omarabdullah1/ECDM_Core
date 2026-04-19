import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const checks: string[] = [];

// ── Check 1: MongoDB URI ──────────────────────────────────
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
    checks.push('✅ MONGODB_URI loaded: ' + mongoUri);
} else {
    checks.push('❌ MONGODB_URI is MISSING');
}

// ── Check 2: JWT Secrets ──────────────────────────────────
const jwtSecret = process.env.JWT_SECRET;
const jwtRefresh = process.env.JWT_REFRESH_SECRET;
const jwtExpiry = process.env.JWT_EXPIRES_IN;
const jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN;

checks.push(jwtSecret && jwtSecret.length >= 16
    ? `✅ JWT_SECRET loaded (length: ${jwtSecret.length})`
    : '❌ JWT_SECRET is MISSING or too short (must be 16+ chars)');

checks.push(jwtRefresh && jwtRefresh.length >= 16
    ? `✅ JWT_REFRESH_SECRET loaded (length: ${jwtRefresh.length})`
    : '❌ JWT_REFRESH_SECRET is MISSING or too short');

checks.push(`✅ JWT_EXPIRES_IN: ${jwtExpiry || '(not set, default 15m)'}`);
checks.push(`✅ JWT_REFRESH_EXPIRES_IN: ${jwtRefreshExpiry || '(not set, default 7d)'}`);

// ── Check 3: JWT sign + verify round-trip ─────────────────
try {
    if (!jwtSecret) throw new Error('JWT_SECRET not set');
    const token = jwt.sign({ userId: 'test-user' }, jwtSecret, { expiresIn: '1m' });
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    checks.push(`✅ JWT sign/verify round-trip: OK (payload.userId = "${decoded.userId}")`);
} catch (e: unknown) {
    const err = e as Error;
    checks.push(`❌ JWT sign/verify FAILED: ${err.message}`);
}

// ── Check 4: MongoDB live connection ──────────────────────
const runChecks = async () => {
    try {
        if (!mongoUri) throw new Error('No URI');
        await mongoose.connect(mongoUri);
        checks.push(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
        
        // Count users to confirm data is accessible
        const db = mongoose.connection.db;
        if (db) {
            const userCount = await db.collection('users').countDocuments();
            checks.push(`✅ Users in DB: ${userCount}`);
        }
        await mongoose.disconnect();
    } catch (e: unknown) {
        const err = e as Error;
        checks.push(`❌ MongoDB connection FAILED: ${err.message}`);
    }

    console.log('\n====== JWT & MongoDB Health Check ======');
    checks.forEach(c => console.log(c));
    console.log('========================================\n');
};

runChecks();
