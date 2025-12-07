/**
 * Get the rank name for a given userRating based on metadata
 * @param {number} userRating - The user's rating
 * @param {Array} metadataList - Array of metadata objects
 * @returns {string} - The rank name (e.g., "Gold", "Platinum", "Silver")
 */
export const getRankForRating = (userRating, metadataList) => {
  // Default rank if no rating or invalid
  if (!userRating || userRating === 0 || !metadataList || metadataList.length === 0) {
    return null;
  }

  // Filter metadata to only Rank type
  const rankMetadata = metadataList.filter(
    (meta) => meta.metadataType === 'Rank' && meta.minRank !== undefined && meta.maxRank !== undefined
  );

  // If no rank metadata found, return default
  if (rankMetadata.length === 0) {
    return null;
  }

  // Sort by minRank descending to check highest ranks first
  // This ensures we get the highest matching rank if there are overlaps
  const sortedRanks = [...rankMetadata].sort((a, b) => (b.minRank || 0) - (a.minRank || 0));

  // Find the first rank where userRating falls within the range
  const matchingRank = sortedRanks.find(
    (rank) => userRating >= rank.minRank && userRating <= rank.maxRank
  );

  // Return matching rank name or default to Silver
  return matchingRank ? matchingRank.metadataName : null;
};

