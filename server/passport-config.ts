import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { authService } from "./services/auth-service";
import type { User } from "@shared/schema";

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await authService.login({ username, password });
      
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }
      
      return done(null, user);
    } catch (error: any) {
      return done(null, false, { message: error.message });
    }
  })
);

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await authService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
