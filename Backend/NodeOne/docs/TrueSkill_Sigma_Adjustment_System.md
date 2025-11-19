# TrueSkill Sigma Adjustment System

## Overview

This document explains the custom sigma (uncertainty) adjustment system implemented in the `updateUserQuestionTrueskill` function. The system modifies TrueSkill's default sigma calculations based on the relationship between user skill and question difficulty, as well as the user's current streak.

## Background: What is Sigma?

In TrueSkill, **sigma (σ)** represents the **uncertainty** in a player's skill rating:
- **Low sigma** = High confidence in the skill rating (less uncertainty)
- **High sigma** = Low confidence in the skill rating (more uncertainty)

Sigma naturally decreases over time as more data is collected, but our custom system adds intelligent adjustments based on context.

---

## Core Principles

The adjustment system follows these principles:

1. **Expected outcomes reduce uncertainty** → Sigma decreases
2. **Unexpected outcomes increase uncertainty** → Sigma increases
3. **Streaks amplify adjustments** → Longer streaks make changes more pronounced

---

## Mathematical Formulas

### Base Constants

```typescript
SIGMA_ADJUSTMENT_FACTOR = 0.1  // 10% base adjustment
STREAK_MULTIPLIER = min(1 + (currentStreak × 0.1), 3.0)
SIGMA_MIN = 3  // Minimum allowed sigma value
```

### Streak Multiplier Calculation

The streak multiplier scales linearly with the current streak, capped at 3.0:

| Streak | Multiplier | Formula |
|--------|-----------|---------|
| 0 | 1.0x | 1 + (0 × 0.1) |
| 1 | 1.1x | 1 + (1 × 0.1) |
| 5 | 1.5x | 1 + (5 × 0.1) |
| 10 | 2.0x | 1 + (10 × 0.1) |
| 20+ | 3.0x (capped) | min(1 + (20 × 0.1), 3.0) |

### Sigma Adjustment Formula

The adjusted sigma is calculated as:

```
adjustedSigma = trueSkillSigma × (1 ± (SIGMA_ADJUSTMENT_FACTOR × STREAK_MULTIPLIER))
```

Where:
- **`-`** is used when sigma should decrease (expected outcomes)
- **`+`** is used when sigma should increase (unexpected outcomes)

---

## Decision Logic

### Step 1: Determine User-Question Relationship

```typescript
userIsSmarter = currentUserMu > currentQMu
userIsDumber = currentUserMu < currentQMu
questionIsEasy = currentQMu < currentUserMu
questionIsHard = currentQMu > currentUserMu
```

### Step 2: Apply Adjustments Based on Scenario

#### Scenario 1: Smarter User (User Mu > Question Mu)

**Case 1A: User Wins (Expected)**
- **Action**: Decrease sigma
- **Formula**: `sigma × (1 - 0.1 × STREAK_MULTIPLIER)`
- **Reasoning**: Expected outcome confirms skill level → reduce uncertainty

**Case 1B: User Loses (Unexpected)**
- **Action**: Increase sigma
- **Formula**: `sigma × (1 + 0.1 × STREAK_MULTIPLIER)`
- **Reasoning**: Unexpected loss → increase uncertainty, especially if breaking a streak

#### Scenario 2: Dumber User (User Mu < Question Mu)

**Case 2A: User Wins Against Easy Question**
- **Action**: Decrease sigma
- **Formula**: `sigma × (1 - 0.1 × STREAK_MULTIPLIER)`
- **Reasoning**: Beating an easy question is expected → reduce uncertainty

**Case 2B: User Wins Against Hard Question**
- **Action**: Increase sigma
- **Formula**: `sigma × (1 + 0.1 × STREAK_MULTIPLIER)`
- **Reasoning**: Unexpected win → increase uncertainty (maybe user is better than we thought)

**Case 2C: User Loses**
- **Action**: Increase sigma (moderate)
- **Formula**: `sigma × (1 + 0.1 × STREAK_MULTIPLIER × 0.5)`
- **Reasoning**: Breaking a streak increases uncertainty, but less dramatically than unexpected wins

---

## Examples

### Example 1: Smarter User Beats Easy Question

**Initial State:**
- User Mu: 25, User Sigma: 8.0
- Question Mu: 15, Question Sigma: 5.0
- Streak: 3
- Result: ✓ Correct

**TrueSkill Output:**
- New User Sigma: 7.5

**Custom Adjustment:**
```
STREAK_MULTIPLIER = 1 + (3 × 0.1) = 1.3
Adjustment = 0.1 × 1.3 = 0.13 (13%)
Adjusted Sigma = 7.5 × (1 - 0.13) = 7.5 × 0.87 = 6.525
```

**Result:** Sigma decreases from 7.5 to 6.525 (13% reduction)

---

### Example 2: Smarter User Loses Easy Question

**Initial State:**
- User Mu: 25, User Sigma: 8.0
- Question Mu: 15, Question Sigma: 5.0
- Streak: 5
- Result: ✗ Incorrect

**TrueSkill Output:**
- New User Sigma: 8.2

**Custom Adjustment:**
```
STREAK_MULTIPLIER = 1 + (5 × 0.1) = 1.5
Adjustment = 0.1 × 1.5 = 0.15 (15%)
Adjusted Sigma = 8.2 × (1 + 0.15) = 8.2 × 1.15 = 9.43
```

**Result:** Sigma increases from 8.2 to 9.43 (15% increase)

---

### Example 3: Dumb User Beats Hard Question

**Initial State:**
- User Mu: 15, User Sigma: 10.0
- Question Mu: 25, Question Sigma: 6.0
- Streak: 2
- Result: ✓ Correct

**TrueSkill Output:**
- New User Sigma: 9.8

**Custom Adjustment:**
```
STREAK_MULTIPLIER = 1 + (2 × 0.1) = 1.2
Adjustment = 0.1 × 1.2 = 0.12 (12%)
Adjusted Sigma = 9.8 × (1 + 0.12) = 9.8 × 1.12 = 10.976
```

**Result:** Sigma increases from 9.8 to 10.976 (12% increase) - unexpected win increases uncertainty

---

### Example 4: Dumb User Loses

**Initial State:**
- User Mu: 15, User Sigma: 10.0
- Question Mu: 25, Question Sigma: 6.0
- Streak: 7
- Result: ✗ Incorrect

**TrueSkill Output:**
- New User Sigma: 10.2

**Custom Adjustment:**
```
STREAK_MULTIPLIER = 1 + (7 × 0.1) = 1.7
Adjustment = 0.1 × (1.7 × 0.5) = 0.085 (8.5%)
Adjusted Sigma = 10.2 × (1 + 0.085) = 10.2 × 1.085 = 11.067
```

**Result:** Sigma increases from 10.2 to 11.067 (8.5% increase) - moderate increase when losing

---

## Adjustment Summary Table

| Scenario | User vs Question | Result | Base Adjustment | Streak 0 | Streak 5 | Streak 10 |
|----------|------------------|--------|-----------------|----------|----------|-----------|
| Smarter beats easy | User Mu > Q Mu | ✓ | -10% | -10% | -15% | -20% |
| Smarter loses easy | User Mu > Q Mu | ✗ | +10% | +10% | +15% | +20% |
| Dumb beats easy | User Mu < Q Mu (easy) | ✓ | -10% | -10% | -15% | -20% |
| Dumb beats hard | User Mu < Q Mu (hard) | ✓ | +10% | +10% | +15% | +20% |
| Dumb loses | User Mu < Q Mu | ✗ | +5% | +5% | +7.5% | +10% |

---

## Key Insights

### 1. Streak Amplification
- **Longer streaks** = More pronounced sigma changes
- **Continuing a streak** (expected outcome) → Greater confidence boost
- **Breaking a streak** (unexpected outcome) → Greater uncertainty increase

### 2. Expected vs Unexpected
- **Expected outcomes** (smarter user wins, dumb user beats easy) → Sigma decreases
- **Unexpected outcomes** (smarter user loses, dumb user beats hard) → Sigma increases

### 3. Safety Limits
- All sigma values are clamped to `SIGMA_MIN = 3` to prevent unrealistic uncertainty values
- Streak multiplier is capped at 3.0 to prevent excessive adjustments

---

## Implementation Location

**File:** `src/services/UserChapterSession.ts`  
**Function:** `updateUserQuestionTrueskill`  
**Lines:** 260-313

---

## Future Considerations

Potential enhancements to consider:

1. **Dynamic Adjustment Factor**: Make `SIGMA_ADJUSTMENT_FACTOR` configurable or adaptive
2. **Question Difficulty Thresholds**: Use absolute thresholds for "easy" vs "hard" instead of relative comparison
3. **Time-Based Decay**: Reduce streak impact over time if streak is very old
4. **Asymmetric Adjustments**: Different adjustment rates for increases vs decreases

---

## References

- TrueSkill Algorithm: [Microsoft Research](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/)
- Implementation: `ts-trueskill` npm package

