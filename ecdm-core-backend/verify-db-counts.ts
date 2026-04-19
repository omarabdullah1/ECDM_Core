import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env file');
    process.exit(1);
}

const verifyData = async () => {
    try {
        console.log('🔌 Connecting to:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        
        const db = mongoose.connection.db;
        
        if (!db) {
            throw new Error('Database connection is not established.');
        }

        const collections = await db.listCollections().toArray();
        console.log('\n--- Database Verification ---');
        console.log('DB Name:', mongoose.connection.name);
        
        if (collections.length === 0) {
            console.log('⚠️  No collections found - database is empty');
        } else {
            console.log('Collections & Counts:');
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments();
                console.log(` - ${col.name}: ${count} documents`);
            }
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Verification complete');
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
};

verifyData();
