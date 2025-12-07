
const MU_MIN: number = 3;
const SIGMA_MIN: number = 3; 
const SIGMA_LT_SCALING_FACTOR: number = 5;
const SIGMA_GT_SCALING_FACTOR: number = 0.01;
const SIGMA_DECAY_CONST = 0.5;


const USER_DEFAULT_MU: number = 2.5;
const USER_DEFAULT_SIGMA: number = 5;
const USER_RATING_MAX: number = 20000;
const USER_RATING_DEFAULT: number = 500;
const USER_RATING_MULTIPLIER: number = 100;

export interface SigmaBoostConfig {
  sigmaBase: number;    // baseline target σ
  baseBoost: number;    // minimum σ increase
  maxBoost: number;     // extra σ increase scaled by W
  minHistorySize: number; // minimum accuracy history needed
}

const DEFAULT_SIGMA_BOOST_CONFIG: SigmaBoostConfig = {
  sigmaBase: 1.5,
  baseBoost: 0.5,
  maxBoost: 1.0,
  minHistorySize: 5
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
    DEFAULT_SIGMA_BOOST_CONFIG
}