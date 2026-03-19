const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.error('Missing .env file in backend folder.');
      process.exit(1);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not set in .env');
      process.exit(1);
    }

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const users = db.collection('users');

    const email = 'admin@ecdmsolutions.com';
    const plainPassword = 'Admin1234';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const now = new Date();
    const result = await users.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          firstName: 'System',
          lastName: 'Admin',
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'Admin',
          isActive: true,
          phone: '+201000000000',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const finalUser = await users.findOne(
      { email: email.toLowerCase() },
      { projection: { email: 1, role: 1, isActive: 1, firstName: 1, lastName: 1 } }
    );

    console.log('Admin user upserted successfully.');
    console.log(JSON.stringify({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      user: finalUser,
    }, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to upsert admin user:', error.message || error);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();
