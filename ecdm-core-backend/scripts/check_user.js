#!/usr/bin/env node
/*
Standalone script to inspect (and optionally reset) the admin user.

Usage:
  node scripts/check_user.js                # prints user info
  RESET_PASSWORD=1 NEW_PASSWORD=Admin1234 node scripts/check_user.js  # update password

This script loads .env from the backend folder.
*/
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

const DB_NAME = 'ecdm_core';
const EMAIL = 'admin@ecdmsolutions.com';

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    const user = await users.findOne({ email: EMAIL }, { projection: { email: 1, password: 1, isActive: 1, lastLogin: 1 } });
    if (!user) {
      console.log('User not found:', EMAIL);
      return;
    }

    console.log('User:', { email: user.email, isActive: user.isActive, lastLogin: user.lastLogin });

    if (user.password && typeof user.password === 'string') {
      const looksHashed = user.password.startsWith('$2') && user.password.length > 40;
      console.log('Password stored looks hashed:', looksHashed);
    } else {
      console.log('No password field present');
    }

    if (process.env.RESET_PASSWORD === '1') {
      const newPass = process.env.NEW_PASSWORD || 'Admin1234';
      const hash = await bcrypt.hash(newPass, 12);
      const res = await users.updateOne({ email: EMAIL }, { $set: { password: hash, isActive: true } });
      if (res.modifiedCount === 1) {
        console.log('Password updated and user activated. New password:', newPass);
      } else {
        console.log('Password update did not modify any document. Result:', res.result || res);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
})();
