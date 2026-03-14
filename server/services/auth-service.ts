import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, type User, type RegisterUser, type LoginUser } from "../../shared/schema.js";

export class AuthService {
  async register(userData: RegisterUser): Promise<Omit<User, 'password'>> {
    // Check if username or email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error("Username already exists");
    }

    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingEmail.length > 0) {
      throw new Error("Email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: 'editor',
        isActive: true,
      })
      .returning();

    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(credentials: LoginUser): Promise<Omit<User, 'password'> | null> {
    // Find user by username
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, credentials.username))
      .limit(1);

    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error("Account is disabled");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user || null;
  }
}

export const authService = new AuthService();
