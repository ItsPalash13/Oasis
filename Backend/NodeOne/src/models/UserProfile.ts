import mongoose, { Schema, Document } from 'mongoose';

// UserBadge subdocument schema and interface
interface UserBadge {
  badgeId: Schema.Types.ObjectId;
  level: number;
  userLevelSessionId: string;
  createdAt: Date;
}

const UserBadgeSchema = new Schema<UserBadge>({
  badgeId: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },
  level: { type: Number, required: true },
  userLevelSessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// Define the interface for the UserProfile document
interface UserProfileDocument extends Document {
  userId: string;
  username: string;
  email: string;
  role: string | 'student' | 'teacher' | 'admin';
  fullName?: string;
  organizationId?: mongoose.Types.ObjectId; // Added organization field (optional)
  health: number;
  totalCoins: number;
  bio?: string;
  dob?: Date; // Added date of birth field (optional)
  avatar?: string; // Added avatar field
  avatarBgColor?: string; // Added avatar background color field
  badges: UserBadge[];
  dailyAttemptsStreak: number;
  lastAttemptDate: Date | null;
  dailyScorePR: number;
  uniqueCorrectQuestions: string[];
  uniqueTopics: string[];
  monthlyXp: { [key: string]: number }; // YYYY/MM format keys with totalXp values
  onboardingCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema for UserProfile
const UserProfileSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'student', enum: ['student', 'teacher', 'admin'] },
    fullName: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' }, // Added organization field
    bio: { type: String },
    dob: { type: Date }, // Added date of birth field
    avatar: { type: String }, // Added avatar field
    avatarBgColor: { type: String }, // Added avatar background color field
    onboardingCompleted: { type: Boolean, default: false },
    uniqueCorrectQuestions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    uniqueTopics: [{
      type: Schema.Types.ObjectId,
      ref: 'Topic'
    }],
    dailyScorePR: { type: Number, default: 0 },
    dailyAttemptsStreak: { type: Number, default: 0 },
    lastAttemptDate: { type: Date, default: null },
    health: { type: Number, default: 6 },
    totalCoins: { type: Number, default: 0 },
    badges: { type: [UserBadgeSchema], default: [] },
    monthlyXp: { type: Object, default: {} }, // YYYY/MM format keys with totalXp values
  },
  {
    timestamps: true,
  }
);

UserProfileSchema.index({ userId: 1, monthlyXp: 1 }, { unique: true });
UserProfileSchema.index({ organizationId: 1 }); // Index for organization queries

// Create the Mongoose model for UserProfile
const UserProfile = mongoose.model<UserProfileDocument>('UserProfile', UserProfileSchema);

// Export the model and the document interface
export { UserProfile, UserProfileDocument };