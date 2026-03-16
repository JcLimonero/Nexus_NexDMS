export type DataQualityLevel = 'basic' | 'partial' | 'operational' | 'complete';

export interface DataQualityScore {
  score: number;
  level: DataQualityLevel;
  missingFields: string[];
}

export const DATA_QUALITY_LEVELS: Record<DataQualityLevel, { min: number; max: number }> = {
  basic: { min: 0, max: 39 },
  partial: { min: 40, max: 69 },
  operational: { min: 70, max: 89 },
  complete: { min: 90, max: 100 },
};

export function getLevelFromScore(score: number): DataQualityLevel {
  if (score >= 90) return 'complete';
  if (score >= 70) return 'operational';
  if (score >= 40) return 'partial';
  return 'basic';
}
