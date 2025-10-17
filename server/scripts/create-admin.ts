#!/usr/bin/env tsx
/**
 * Script to create the first admin user
 * Usage: npx tsx server/scripts/create-admin.ts
 */

import { db } from "db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@rionoticias.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Administrator";

  try {
    // Check if admin already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length > 0) {
      console.log(`❌ User '${username}' already exists`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const [admin] = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        isActive: true,
      })
      .returning();

    console.log('✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Email: ${email}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
