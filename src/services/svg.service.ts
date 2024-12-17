import * as fs from 'fs';
import * as path from 'path';
import { HeaderImageQuality } from '../types/interfaces.js';

export class SVGService {
  public evaluateHeaderImageQuality(imgSrc: string | undefined, content: string): HeaderImageQuality {
    if (!imgSrc || !imgSrc.endsWith('.svg')) {
      return {
        hasGradient: false,
        hasAnimation: false,
        hasRoundedCorners: false,
        hasEnglishText: false,
        isProjectSpecific: false,
      };
    }

    try {
      // SVGファイルの内容を読み取る
      const svgPath = path.join(process.cwd(), imgSrc);
      const svgContent = fs.existsSync(svgPath) ? fs.readFileSync(svgPath, 'utf-8') : '';

      return {
        // グラデーションの確認（linearGradient, radialGradient, またはstop-color属性）
        hasGradient: svgContent.includes('linearGradient') || 
                    svgContent.includes('radialGradient') || 
                    svgContent.includes('stop-color'),
        
        // アニメーションの確認（animate要素またはアニメーション関連属性）
        hasAnimation: svgContent.includes('<animate') || 
                     svgContent.includes('animateTransform') || 
                     svgContent.includes('animateMotion') ||
                     svgContent.includes('@keyframes'),
        
        // 角丸の確認（rx/ry属性または border-radius）
        hasRoundedCorners: svgContent.includes('rx="') || 
                          svgContent.includes('ry="') || 
                          svgContent.includes('border-radius'),
        
        // 英語テキストの確認（3文字以上の英単語）
        hasEnglishText: /[A-Za-z]{3,}/.test(svgContent),
        
        // プロジェクト固有の要素を確認
        isProjectSpecific: this.checkProjectSpecificImage(svgContent, content),
      };
    } catch (error) {
      console.error('SVG評価エラー:', error);
      return {
        hasGradient: false,
        hasAnimation: false,
        hasRoundedCorners: false,
        hasEnglishText: false,
        isProjectSpecific: false,
      };
    }
  }

  private checkProjectSpecificImage(svgContent: string, readmeContent: string): boolean {
    try {
      // READMEからプロジェクト名やキーワードを抽出
      const projectKeywords = this.extractProjectKeywords(readmeContent);
      const svgText = svgContent.toLowerCase();
      
      // キーワードをSVGで使用しているか確認
      return projectKeywords.some(keyword => 
        svgText.includes(keyword.toLowerCase())
      );
    } catch {
      return false;
    }
  }

  private extractProjectKeywords(readmeContent: string): string[] {
    const keywords = new Set<string>();
    
    // タイトルからキーワードを抽出
    const titleMatch = readmeContent.match(/^#\s+([^\n]+)/m);
    if (titleMatch) {
      const titleWords = titleMatch[1].split(/[\s-_]+/);
      titleWords.forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }

    // 最初の説明文からキーワードを抽出
    const descriptionMatch = readmeContent.match(/^>\s*["']([^"'\n]+)["']/m);
    if (descriptionMatch) {
      const descWords = descriptionMatch[1].split(/[\s-_]+/);
      descWords.forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }

    // プロジェクト固有の技術用語を追加
    const technicalTerms = ['DocuMind', 'MCP', 'Server', 'Documentation', 'Quality', 'Analysis'];
    technicalTerms.forEach(term => keywords.add(term));

    return Array.from(keywords);
  }
}