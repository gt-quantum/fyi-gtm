/**
 * Check if a tool should be considered "new" based on its publish date.
 * Tools are considered new for 15 days after publication.
 *
 * @param publishedAt - The date the tool was published
 * @param daysThreshold - Number of days to consider a tool "new" (default: 15)
 * @returns boolean - Whether the tool is considered new
 */
export function isToolNew(publishedAt: string | Date, daysThreshold: number = 15): boolean {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const diffInMs = now.getTime() - publishDate.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= daysThreshold;
}
