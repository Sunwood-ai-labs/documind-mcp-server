export interface ReadmeEvaluation {
  filePath: string;
  hasHeaderImage: boolean;
  headerImageQuality: HeaderImageQuality;
  isCentered: {
    headerImage: boolean;
    title: boolean;
    badges: boolean;
  };
  hasBadges: {
    english: boolean;
    japanese: boolean;
    isCentered: boolean;
    hasCorrectFormat: boolean;
  };
  hasReadme: {
    english: boolean;
    japanese: boolean;
  };
  score: number;
  suggestions: string[];
}

export interface HeaderImageQuality {
  hasGradient: boolean;
  hasAnimation: boolean;
  hasRoundedCorners: boolean;
  hasEnglishText: boolean;
  isProjectSpecific: boolean;
}

export interface BadgeEvaluation {
  hasEnglishBadge: boolean;
  hasJapaneseBadge: boolean;
  isCentered: boolean;
  hasCorrectFormat: boolean;
}