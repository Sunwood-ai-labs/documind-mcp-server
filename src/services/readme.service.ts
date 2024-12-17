import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import * as cheerio from 'cheerio';
import { ReadmeEvaluation, BadgeEvaluation } from '../types/interfaces.js';
import { findReadmeFiles } from '../utils/file.utils.js';
import { SVGService } from './svg.service.js';

export class ReadmeService {
  private svgService: SVGService;

  constructor() {
    this.svgService = new SVGService();
  }

  public async evaluateAllReadmes(projectPath: string): Promise<ReadmeEvaluation[]> {
    const readmeFiles = await findReadmeFiles(projectPath);
    const evaluations: ReadmeEvaluation[] = [];

    for (const readmePath of readmeFiles) {
      const dirPath = path.dirname(readmePath);
      const evaluation = await this.evaluateReadme(dirPath, readmePath);
      evaluations.push(evaluation);
    }

    return evaluations;
  }

  private async evaluateReadme(dirPath: string, readmePath: string): Promise<ReadmeEvaluation> {
    const content = fs.readFileSync(readmePath, 'utf-8');
    const badgeEvaluation = this.evaluateLanguageBadges(content);

    const evaluation: ReadmeEvaluation = {
      filePath: readmePath,
      hasHeaderImage: false,
      headerImageQuality: {
        hasGradient: false,
        hasAnimation: false,
        hasRoundedCorners: false,
        hasEnglishText: false,
        isProjectSpecific: false,
      },
      isCentered: {
        headerImage: false,
        title: false,
        badges: badgeEvaluation.isCentered,
      },
      hasBadges: {
        english: badgeEvaluation.hasEnglishBadge,
        japanese: badgeEvaluation.hasJapaneseBadge,
        isCentered: badgeEvaluation.isCentered,
        hasCorrectFormat: badgeEvaluation.hasCorrectFormat,
      },
      hasReadme: {
        english: fs.existsSync(path.join(dirPath, 'README.md')),
        japanese: fs.existsSync(path.join(dirPath, 'README.ja.md')),
      },
      score: 0,
      suggestions: [],
    };

    // marked.parseは非同期なので、awaitを使用
    const html = await Promise.resolve(marked.parse(content));
    const $ = cheerio.load(html);

    // その他の評価ロジック...
    this.evaluateHeaderImage($, evaluation, content);
    this.evaluateTitle($, evaluation);
    
    this.calculateScore(evaluation);
    this.generateSuggestions(evaluation, dirPath, readmePath);

    return evaluation;
  }

  private evaluateLanguageBadges(content: string): BadgeEvaluation {
    const evaluation: BadgeEvaluation = {
      hasEnglishBadge: false,
      hasJapaneseBadge: false,
      isCentered: false,
      hasCorrectFormat: false,
    };

    // 中央揃えdivの確認
    const centerDivRegex = /<div[^>]*align=["']center["'][^>]*>/i;
    evaluation.isCentered = centerDivRegex.test(content);

    // 英語バッジの確認
    const englishBadgeRegex = /img\.shields\.io\/badge\/[^-]+-(?:english|document)-/i;
    evaluation.hasEnglishBadge = englishBadgeRegex.test(content);

    // 日本語バッジの確認
    const japaneseBadgeRegex = /img\.shields\.io\/badge\/[^-]+-(?:日本語|ドキュメント)-/i;
    evaluation.hasJapaneseBadge = japaneseBadgeRegex.test(content);

    // 正しいフォーマットの確認（中央揃えdivの中にバッジがあるか）
    const correctFormatRegex = /<div[^>]*align=["']center["'][^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<img[^>]*shields\.io[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>/i;
    evaluation.hasCorrectFormat = correctFormatRegex.test(content);

    return evaluation;
  }

  private evaluateHeaderImage($: cheerio.CheerioAPI, evaluation: ReadmeEvaluation, content: string): void {
    const headerImage = $('img').first();
    if (headerImage.length) {
      evaluation.hasHeaderImage = true;
      const imgSrc = headerImage.attr('src');
      if (imgSrc?.includes('assets/') && imgSrc?.endsWith('.svg')) {
        evaluation.isCentered.headerImage = headerImage.parent().attr('align') === 'center';
        evaluation.headerImageQuality = this.svgService.evaluateHeaderImageQuality(imgSrc, content);
      }
    }
  }

  private evaluateTitle($: cheerio.CheerioAPI, evaluation: ReadmeEvaluation): void {
    const h1 = $('h1').first();
    if (h1.length) {
      evaluation.isCentered.title = h1.parent().attr('align') === 'center';
    }
  }

  private calculateScore(evaluation: ReadmeEvaluation): void {
    let score = 0;
    // 既存のスコアリング
    if (evaluation.hasHeaderImage) score += 10;
    if (evaluation.headerImageQuality.hasGradient) score += 2;
    if (evaluation.headerImageQuality.hasAnimation) score += 2;
    if (evaluation.headerImageQuality.hasRoundedCorners) score += 2;
    if (evaluation.headerImageQuality.hasEnglishText) score += 2;
    if (evaluation.headerImageQuality.isProjectSpecific) score += 2;
    if (evaluation.isCentered.headerImage) score += 10;
    if (evaluation.isCentered.title) score += 10;

    // 言語切り替えバッジのスコアリング
    if (evaluation.hasBadges.english) score += 15;
    if (evaluation.hasBadges.japanese) score += 15;
    if (evaluation.hasBadges.isCentered) score += 10;
    if (evaluation.hasBadges.hasCorrectFormat) score += 10;

    if (evaluation.hasReadme.english) score += 10;
    if (evaluation.hasReadme.japanese) score += 10;

    evaluation.score = score;
  }

  private generateSuggestions(evaluation: ReadmeEvaluation, dirPath: string, readmePath: string): void {
    const relativePath = path.relative(dirPath, readmePath);

    // 既存の提案...
    if (!evaluation.hasHeaderImage) {
      evaluation.suggestions.push(`${relativePath}: ヘッダー画像が見つかりません。assets/ディレクトリにSVG画像を追加することを推奨します。`);
    }

    // 言語切り替えバッジの提案
    if (!evaluation.hasBadges.english || !evaluation.hasBadges.japanese) {
      evaluation.suggestions.push(`${relativePath}: 言語切り替えバッジ（英語・日本語）を追加してください。以下の形式を推奨します：
      <div align="center">
         <a href="README.md"><img src="https://img.shields.io/badge/english-document-white.svg" alt="EN doc"></a>
         <a href="README.ja.md"><img src="https://img.shields.io/badge/ドキュメント-日本語-white.svg" alt="JA doc"/></a>
      </div>`);
    }

    if (!evaluation.hasBadges.isCentered) {
      evaluation.suggestions.push(`${relativePath}: 言語切り替えバッジを中央揃えにしてください。`);
    }

    if (!evaluation.hasBadges.hasCorrectFormat) {
      evaluation.suggestions.push(`${relativePath}: 言語切り替えバッジのフォーマットが正しくありません。推奨される形式を使用してください。`);
    }

    if (!evaluation.hasReadme.japanese) {
      evaluation.suggestions.push(`${relativePath}: 日本語版のREADME (README.ja.md) を追加してください。`);
    }
  }
}