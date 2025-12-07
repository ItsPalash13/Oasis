## Sigma Stability Boost Implementation (2025-12-07)

### Summary
- Implemented sigma boosting mechanism that increases user sigma when below baseline, with larger boosts for stable accuracy (low std dev) and smaller boosts for unstable accuracy (high std dev).
- Boost is applied during quiz initiation before question selection.
- Uses normalized standard deviation of recent accuracy history to determine stability weight.

### Backend Changes

#### Configuration
- **File**: `Backend/NodeOne/src/config/constants.ts`
  - Added `SigmaBoostConfig` interface
  - Added `DEFAULT_SIGMA_BOOST_CONFIG`:
    - `sigmaBase: 1.5` - Baseline target sigma
    - `baseBoost: 0.5` - Minimum sigma increase
    - `maxBoost: 1.0` - Extra sigma increase scaled by stability weight
    - `minHistorySize: 5` - Minimum accuracy history needed

#### Services

- **File**: `Backend/NodeOne/src/services/quizv3/userchapter-session/TrueskillHandler.ts`
  - Added `getRecentAccuracies()`: Extracts and normalizes `averageAccuracy` values from `userAttemptWindowList` (converts percentages > 1 to [0,1] range)
  - Added `calculateAccuracyStats()`: Calculates mean, standard deviation, and normalized standard deviation
  - Added `calculateStabilityWeight()`: Calculates W = 1 - std_norm (stable → W ≈ 1, unstable → W ≈ 0)
  - Added `applySigmaBoost()`: Applies boost logic (only if sigma < sigma_base)
    - Formula: `Δσ = base_boost + W * max_boost`
    - Result: `σ_new = σ + Δσ` (no capping)
  - Added `applySigmaBoostToUserSession()`: Main exported function that applies boost to user session
  - Comprehensive logging added for debugging boost process

- **File**: `Backend/NodeOne/src/services/quizv3/quiz/InitiateQuiz.ts`
  - Integrated `applySigmaBoostToUserSession()` call before fetching questions
  - Ensures sigma is boosted (if needed) before question selection

- **File**: `Backend/NodeOne/src/services/quizv3/quiz/SubmitQuiz.ts`
  - Fixed error handling for missing `question.correct` property
  - Added safety checks to prevent "Cannot read properties of undefined" errors

### Mathematical Implementation

**Normalized Standard Deviation:**
- Max possible std dev for values in [0,1] = 0.5
- `std_norm = min(1, σₐ / 0.5)`

**Stability Weight:**
- `W = 1 - std_norm`
- Stable accuracy (low std dev) → W ≈ 1 → larger boost
- Unstable accuracy (high std dev) → W ≈ 0 → smaller boost

**Boost Calculation:**
- Only applies if `sigma < sigma_base`
- `Δσ = base_boost + W * max_boost`
- `σ_new = σ + Δσ` (can exceed baseline)

### Features
- Only boosts when sigma < baseline (1.5)
- Uses last `minHistorySize` accuracy values from `userAttemptWindowList`
- Normalizes accuracy values (percentages > 1 converted to [0,1])
- Always applies at least `baseBoost` (0.5)
- Stability-based scaling: more stable performance gets larger boost
- Comprehensive logging for debugging and monitoring
