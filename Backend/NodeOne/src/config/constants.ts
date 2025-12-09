import dotenv from 'dotenv';

// Load environment variables if not already loaded
dotenv.config();

const MU_MIN: number = 3;
const SIGMA_MIN: number = 3; 
const SIGMA_LT_SCALING_FACTOR: number = 5;
const SIGMA_GT_SCALING_FACTOR: number = 0.01;
const SIGMA_DECAY_CONST = 0.5;


const USER_DEFAULT_MU: number = parseFloat(process.env.USER_DEFAULT_MU || '2.5');
const USER_DEFAULT_SIGMA: number = parseFloat(process.env.USER_DEFAULT_SIGMA || '3');
const USER_RATING_MAX: number = parseInt(process.env.USER_RATING_MAX || '20000', 10);
const USER_RATING_DEFAULT: number = parseInt(process.env.USER_RATING_DEFAULT || '0', 10);
const USER_RATING_MULTIPLIER: number = parseInt(process.env.USER_RATING_MULTIPLIER || '100', 10);

const QUESTION_FETCH_LIMIT: number = parseInt(process.env.QUESTION_FETCH_LIMIT || '3', 10);
export interface SigmaBoostConfig {
  sigmaBase: number;    // baseline target σ
  baseBoost: number;    // minimum σ increase
  maxBoost: number;     // extra σ increase scaled by W
  minHistorySize: number; // minimum accuracy history needed
}

const DEFAULT_SIGMA_BOOST_CONFIG: SigmaBoostConfig = {
  sigmaBase: parseFloat(process.env.SIGMA_BOOST_SIGMA_BASE || '1.5'),
  baseBoost: parseFloat(process.env.SIGMA_BOOST_BASE_BOOST || '0.5'),
  maxBoost: parseFloat(process.env.SIGMA_BOOST_MAX_BOOST || '1.0'),
  minHistorySize: parseInt(process.env.SIGMA_BOOST_MIN_HISTORY_SIZE || '5', 10)
};

export {
    MU_MIN,
    SIGMA_MIN,
    SIGMA_LT_SCALING_FACTOR,
    SIGMA_GT_SCALING_FACTOR,
    SIGMA_DECAY_CONST,
    USER_DEFAULT_MU,
    USER_DEFAULT_SIGMA,
    USER_RATING_DEFAULT,
    USER_RATING_MAX,
    USER_RATING_MULTIPLIER,
    DEFAULT_SIGMA_BOOST_CONFIG,
    QUESTION_FETCH_LIMIT
}