
import mongoose from 'mongoose';
import { env } from './src/config/env';

const checkDB = async () => {
    try {
        console.log('Current MONGODB_URI in process.env:', process.env.MONGODB_URI);
        console.log('Parsed MONGODB_URI in env.ts:', env.MONGODB_URI);
        
        const conn = await mongoose.connect(env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log('Host:', conn.connection.host);
        console.log('DB Name:', conn.connection.name);
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error checking DB:', error);
    }
};

checkDB();
