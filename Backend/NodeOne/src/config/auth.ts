import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from 'mongoose';
import { UserProfile } from "../models/UserProfile";
import { createAuthMiddleware } from "better-auth/api";
import { Userts } from "../models/UserTs";
import { customSession } from "better-auth/plugins";
let auth: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
    if (!auth) {
        if (!mongoose.connection.db) {
            throw new Error('Database connection not established');
        }
        auth = betterAuth({
            advanced: {
                cookies: {
                    sessionToken: {
                      attributes: {
                        sameSite: "none",
                        secure: true,
                        httpOnly: true
                      }
                    }
                  },
                defaultCookieAttributes: {
                    sameSite: "none",
                    secure: true,
                    httpOnly: true
                }
            },
            database: mongodbAdapter(mongoose.connection.db),
            emailAndPassword: {    
                enabled: true
            },
            plugins: [
                customSession(async ({ user, session }) => {
                    if (user?.id) {
                      const userProfile = await UserProfile.findOne({ userId: user.id });
                      if (userProfile?.lastAttemptDate && userProfile.health < 6) {
                        const lastAttemptDate = new Date(userProfile.lastAttemptDate);
                        const currentDate = new Date();
                        const timeDifference = currentDate.getTime() - lastAttemptDate.getTime();
                        // Reset health to 6 if 6 hours have passed since last attempt
                        const hoursDifference = timeDifference / (1000 * 60 * 60);
                        if (hoursDifference >= 4) {
                          userProfile.health = 6;
                          await userProfile.save();
                        }
                      }
                      if (userProfile) {
                        return {
                          user: {
                            ...user,
                            health: userProfile.health,
                            totalCoins: userProfile.totalCoins,
                            dailyAttemptsStreak: userProfile.dailyAttemptsStreak,
                            avatar: userProfile.avatar,
                            avatarBgColor: userProfile?.avatarBgColor || 'blue',
                            onboardingCompleted: userProfile.onboardingCompleted,
                            role: userProfile.role
                          },
                          session
                        };
                      }
                    }
                    return { user, session };
                }),
            ],
            trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:5173'],
            hooks: {
                after: createAuthMiddleware(async (ctx) => {
                    if (ctx.path.startsWith("/sign-up")) {
                        const newSession = ctx.context.newSession;
                        if (newSession) {
                            const { id, name, email } = newSession.user;
                            
                            // Get avatar data from the request body
                            const requestBody = (ctx as any).body || {};
                            const avatar = requestBody?.avatar || '';
                            const avatarBgColor = requestBody?.avatarBgColor || 'blue';
                            
                            await UserProfile.create({
                                userId: id,
                                username: name,
                                fullName: name,
                                email: email,
                                dob: new Date(),
                                bio: "",
                                onboardingCompleted: false,
                                avatar: avatar,
                                avatarBgColor: avatarBgColor,
                                role: 'student'
                            });
                            await Userts.create({
                                userId: id,
                                skill: { mu: 700, sigma: 200 }
                            });
                        }
                    }
                })
            }
        });
    }
    return auth;
};

// Export a function to get the auth instance
export const getAuthInstance = () => {
    if (!auth) {
        throw new Error('Auth not initialized. Call getAuth() first.');
    }
    return auth;
}; 