// src/utils/feedInjections.js
export const injectAdsRandomly = (posts, ads, minGap = 4, maxGap = 8) => {
  if (!ads.length) return posts;
  const result = [...posts];
  let gap = Math.floor(Math.random() * (maxGap - minGap + 1) + minGap);
  let adIndex = 0;
  let currentPos = gap;
  while (currentPos < result.length && adIndex < ads.length) {
    result.splice(currentPos, 0, { ...ads[adIndex], isAd: true });
    adIndex++;
    gap = Math.floor(Math.random() * (maxGap - minGap + 1) + minGap);
    currentPos += gap + 1; // +1 because we inserted an ad
  }
  // If still have ads left, append at the end
  if (adIndex < ads.length) {
    result.push(...ads.slice(adIndex).map(ad => ({ ...ad, isAd: true })));
  }
  return result;
};