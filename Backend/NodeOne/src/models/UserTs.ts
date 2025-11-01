import mongoose, { Schema, Document } from 'mongoose';

interface ISkill {
  mu: number;    // Mean of the skill rating
  sigma: number; // Standard deviation of the skill rating
}

interface IUser extends Document {
  userId: string;
  skill: ISkill;
}

const SkillSchema = new Schema<ISkill>({
  mu: { type: Number, required: true },
  sigma: { type: Number, required: true }
}, { _id: false });  // Disable _id for skill subdocument

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  skill: { type: SkillSchema, required: true }
});

const Userts = mongoose.model<IUser>('Userts', UserSchema);

export { Userts, IUser, ISkill };
