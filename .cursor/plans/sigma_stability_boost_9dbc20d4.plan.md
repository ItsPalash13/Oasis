---
name: Sigma Stability Boost
overview: Implement sigma boosting algorithm that increases user sigma when below baseline, with larger boosts for stable accuracy (low std dev) and smaller boosts for unstable accuracy (high std dev).
todos:
  - id: create-sigma-boost-handler
    content: Create SigmaBoostHandler.ts with mathematical utilities for calculating accuracy stats, stability weight, and applying sigma boost
    status: completed
  - id: integrate-trueskill-handler
    content: Modify TrueskillHandler.ts to apply sigma boost before TrueSkill calculations using recent accuracy history
    status: completed
  - id: add-configuration-constants
    content: Add sigma boost configuration constants to constants.ts file
    status: completed
  - id: test-sigma-boost-logic
    content: Test the sigma boosting with various accuracy patterns to ensure correct behavior
    status: completed
---

# Sigma Boosting Implementation Plan

## Overview

Add a sigma boosting mechanism to the TrueSkill system that adjusts user sigma based on accuracy stability when sigma is below baseline.

## Implementation Strategy

### 1. Create Sigma Boosting Utility Functions

**File: `Backend/NodeOne/src/services/quizv3/userchapter-session/SigmaBoostHandler.ts`**

Create a new module with these key functions:

- `calculateAccuracyStats(accuracies: number[])` - Calculate mean, std dev, and normalized std dev
- `calculateStabilityWeight(accuracies: number[])` - Calculate W = 1 - std_norm  
- `applySigmaBoost(sigma: number, accuracies: number[], config: SigmaBoostConfig)` - Main function implementing the boost logic
```typescript
interface SigmaBoostConfig {
  sigmaBase: number;    // baseline target σ (default: 8.0)
  baseBoost: number;    // minimum σ increase (default: 1.0) 
  maxBoost: number;     // extra σ increase scaled by W (default: 3.0)
  minHistorySize: number; // minimum accuracy history needed (default: 5)
}
```


### 2. Extract Accuracy History Function

**File: `Backend/NodeOne/src/services/quizv3/userchapter-session/SigmaBoostHandler.ts`**

- `getRecentAccuracies(userAttemptWindowList: IUserAttemptWindow[] | undefined)` 
- Extract `averageAccuracy` values directly from `userChapterSession.analytics.userAttemptWindowList`
- Values are already in [0,1] range, so use them directly
- Return array of accuracy values (may be empty if no history exists)

### 3. Create New Function to Apply Sigma Boost

**File: `Backend/NodeOne/src/services/quizv3/userchapter-session/TrueskillHandler.ts`**

Create a new exported function `applySigmaBoostToUserSession()` that:

- Takes a `UserChapterSession` object
- Extracts recent accuracies from `analytics.userAttemptWindowList`
- Applies sigma boost using the helper functions
- Updates and saves the user session's `trueSkillScore.sigma` if boost is applied
- Returns the boosted sigma value

**Note:** Do NOT modify `updateUserQuestionTrueskillBatch()` function.

### 4. Integrate into InitiateQuiz

**File: `Backend/NodeOne/src/services/quizv3/quiz/InitiateQuiz.ts`**

Call the new sigma boost function in `initiateQuizSession()` before fetching questions:

```8:48:Backend/NodeOne/src/services/quizv3/quiz/InitiateQuiz.ts
// After fetching userChapterSession (around line 23-25)
// Apply sigma boost if needed
await applySigmaBoostToUserSession(userChapterSession);

// Then continue with existing logic to fetch user trueskill data
const userTrueskillData = {
  mu: userChapterSession?.trueSkillScore?.mu || 0,
  sigma: userChapterSession?.trueSkillScore?.sigma || 0,
};
```

### 4. Configuration Constants

**File: `Backend/NodeOne/src/config/constants.ts`**

Add sigma boost configuration:

```typescript
export const DEFAULT_SIGMA_BOOST_CONFIG = {
  sigmaBase: 8.0,
  baseBoost: 1.0, 
  maxBoost: 3.0,
  minHistorySize: 5
};
```

### 5. Function Call Flow

Simple flow of how functions will be called:

```
InitiateQuiz.ts: initiateQuizSession()
  ↓
  calls: applySigmaBoostToUserSession(userChapterSession)
    ↓
    calls: getRecentAccuracies(userChapterSession.analytics?.userAttemptWindowList)
      → returns: number[] (array of averageAccuracy values)
    ↓
    calls: applySigmaBoost(currentSigma, accuracies, config)
      ↓
      calls: calculateAccuracyStats(accuracies)
        → returns: { mean, stdDev, stdNorm }
      ↓
      calls: calculateStabilityWeight(accuracies)
        → uses stdNorm from calculateAccuracyStats
        → returns: W = 1 - stdNorm
      ↓
      → returns: boostedSigma (or original if no boost needed)
    ↓
    updates: userChapterSession.trueSkillScore.sigma = boostedSigma
    saves: userChapterSession.save()
  ↓
  continues with existing quiz initiation logic
```

### 6. Mathematical Implementation Details

**Normalized Standard Deviation:**

- Max possible std dev for binary accuracies = 0.5
- `std_norm = min(1, σₐ / 0.5)`

**Stability Weight:**

- `W = 1 - std_norm`
- Stable → W ≈ 1, Unstable → W ≈ 0

**Boost Calculation:**

- If `sigma >= sigma_base`: no change
- Else: `Δσ = base_boost + W * max_boost`
- `σ_new = min(σ + Δσ, σ_base)`

## Files Modified

1. **MODIFIED:** `Backend/NodeOne/src/services/quizv3/userchapter-session/TrueskillHandler.ts` - Add sigma boost helper functions and new `applySigmaBoostToUserSession()` function (do NOT modify `updateUserQuestionTrueskillBatch()`)
2. **MODIFIED:** `Backend/NodeOne/src/services/quizv3/quiz/InitiateQuiz.ts` - Call `applySigmaBoostToUserSession()` before fetching questions
3. **MODIFIED:** `Backend/NodeOne/src/config/constants.ts` - Add sigma boost configuration

## Testing Considerations

- Edge cases: empty history, all correct/incorrect streaks
- Verify boost only applies when sigma < baseline
- Check boost magnitude scales with stability properly
- Ensure boosted sigma is used correctly in TrueSkill calculations