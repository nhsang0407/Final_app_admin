/**
 * Synchronize User Data from Firebase JSON Export
 * Run: npx ts-node data/seeds/seed-firebase-users.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ponsai';
const JSON_FILE_PATH = path.join(__dirname, '../../../finalapp-c65a2-default-rtdb-export.json');
const DEFAULT_PASSWORD = 'user123';
const ADMIN_PASSWORD = 'nhatnhatnheo';

interface FirebaseAddress {
  createdAt?: number;
  detail: string;
  isDefault: boolean;
  phone?: string;
  receiverName?: string;
}

interface FirebaseUser {
  createdAt?: number;
  email: string;
  name: string;
  role?: 'user' | 'admin';
  phone?: string;
  address?: string;
  avatar?: string;
  authProvider?: 'local' | 'google';
  isActive?: boolean;
}

async function syncFirebaseUsers() {
  try {
    console.log('🌱 Synchronizing Users from Firebase Export...');
    console.log('============================================\n');

    // Check if JSON file exists
    if (!fs.existsSync(JSON_FILE_PATH)) {
      throw new Error(`JSON file not found at: ${JSON_FILE_PATH}`);
    }

    // Read and parse JSON
    console.log('📖 Reading Firebase JSON dump...');
    const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const dbData = JSON.parse(rawData);

    const firebaseUsers = dbData.users || {};
    const firebaseAddresses = dbData.addresses || {};
    const userKeys = Object.keys(firebaseUsers);

    console.log(`✓ Loaded JSON. Found ${userKeys.length} users to sync.`);

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const usersCollection = db.collection('users');

    // Generate hashed default passwords
    const salt = await bcrypt.genSalt(10);
    const hashedDefaultPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);
    const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    let createdCount = 0;
    let updatedCount = 0;

    for (const userId of userKeys) {
      const fbUser: FirebaseUser = firebaseUsers[userId];
      if (!fbUser.email) {
        console.log(`⚠️  Skipping user ${userId} because they have no email.`);
        continue;
      }

      const email = fbUser.email.toLowerCase().trim();
      const name = fbUser.name || 'Firebase User';
      const role = fbUser.role === 'admin' ? 'admin' : 'user';
      const phone = fbUser.phone || '';
      const avatar = fbUser.avatar || '';
      const isActive = fbUser.isActive !== false;
      const authProvider = fbUser.authProvider || 'local';

      // 1. Resolve address
      let userAddress = {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Vietnam'
      };

      if (fbUser.address && typeof fbUser.address === 'string' && fbUser.address.trim()) {
        userAddress.street = fbUser.address.trim();
      } else if (firebaseAddresses[userId]) {
        // Find default or first address
        const addressesObj = firebaseAddresses[userId];
        const addrKeys = Object.keys(addressesObj);
        let selectedAddr: FirebaseAddress | null = null;

        for (const addrKey of addrKeys) {
          const addr: FirebaseAddress = addressesObj[addrKey];
          if (addr.isDefault) {
            selectedAddr = addr;
            break;
          }
        }
        if (!selectedAddr && addrKeys.length > 0) {
          selectedAddr = addressesObj[addrKeys[0]];
        }

        if (selectedAddr && selectedAddr.detail) {
          userAddress.street = selectedAddr.detail.trim();
        }
      }

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        // Update user (preserve existing password)
        await usersCollection.updateOne(
          { email },
          {
            $set: {
              name,
              role,
              phone: phone || existingUser.phone,
              avatar: avatar || existingUser.avatar,
              address: userAddress.street ? userAddress : existingUser.address,
              authProvider,
              isActive,
              isEmailVerified: true,
              updatedAt: new Date()
            }
          }
        );
        console.log(`   🔄 Updated: ${email} (${role})`);
        updatedCount++;
      } else {
        // Create user
        const passwordToUse = email === 'nhatdo@admin.gmail.com' ? hashedAdminPassword : hashedDefaultPassword;
        await usersCollection.insertOne({
          name,
          email,
          password: passwordToUse,
          role,
          phone,
          avatar,
          address: userAddress,
          authProvider,
          isActive,
          isEmailVerified: true,
          createdAt: fbUser.createdAt ? new Date(fbUser.createdAt) : new Date(),
          updatedAt: new Date()
        });
        console.log(`   ✅ Created: ${email} (${role})`);
        createdCount++;
      }
    }

    console.log('\n============================================');
    console.log('📊 Synchronization Summary:');
    console.log(`   ✅ Created: ${createdCount} users`);
    console.log(`   🔄 Updated: ${updatedCount} users`);
    console.log(`   📦 Total Processed: ${userKeys.length} users`);
    console.log('============================================\n');

    console.log('🔑 Credentials Info:');
    console.log(`   • Regular Users Default Password: '${DEFAULT_PASSWORD}'`);
    console.log(`   • Admin (nhatdo@admin.gmail.com) Password: '${ADMIN_PASSWORD}'`);
    console.log('\n✓ User synchronization completed successfully!');

  } catch (error) {
    console.error('❌ Error synchronizing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

syncFirebaseUsers();
