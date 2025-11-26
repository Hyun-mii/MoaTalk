
import { GoogleGenAI } from "@google/genai";
import { type AppData, type NewsSummary } from '../types';

/**
 * Generates a consistent hash code from a string.
 * Used to generate the same image seed for the same news title (Browser Caching).
 */
const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

/**
 * Sanitize user input to prevent basic Prompt Injection attacks.
 * Removes potential control characters and limits length.
 */
const sanitizeInput = (input: string): string => {
    // 1. Remove control characters that might interfere with JSON or Prompt structure
    let sanitized = input.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    // 2. Escape backticks and braces which are often used in prompt manipulation
    sanitized = sanitized.replace(/`/g, "'").replace(/\{/g, "(").replace(/\}/g, ")");

    // 3. Limit length to reasonable size for a search query
    return sanitized.slice(0, 100);
};

export const fetchNewsSummary = async (query: string): Promise<AppData> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Security: Sanitize user input before sending to AI
    const cleanQuery = sanitizeInput(query);

    // Improved Prompt Strategy for "Gemini 2.5 Flash":
    // 1. Simplicity: Ask for simple English keywords for images, not complex sentences.
    // 2. Fallback: Ensure links are real.
    const prompt = `
    You are a professional news curator.
    Date: ${today}
    Query: "${cleanQuery}"

    **TASK**:
    1. Search via 'googleSearch' for the top 3-5 distinct, authoritative news.
    2. Output JSON.

    **FIELDS**:
    - **summary**: 3-5 sentences. Detailed context. Korean.
    - **imageKeywords**:
      - 3-5 concrete English nouns/adjectives describing the scene.
      - NO text, NO graphs, NO abstract concepts.
      - Example: "Blue house, president, press conference, suits" (O)
      - Example: "Economic downfall concept" (X) -> "Red stock arrow, worried trader, monitor" (O)
    - **relatedArticles**:
      - STRICTLY REAL URLs from the search tool.
      - At least 1 valid link per item.

    **JSON Output:**
    {
      "summaries": [
        {
          "title": "Headline",
          "summary": "Content...",
          "imageKeywords": "visually descriptive english keywords",
          "relatedArticles": [ { "headline": "Title", "url": "http..." } ]
        }
      ],
      "recommendations": ["Topic1", "Topic2"]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

        let rawData;
        try {
            rawData = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            throw new Error("데이터 형식이 올바르지 않습니다. 다시 시도해주세요.");
        }

        if (!rawData.summaries || !Array.isArray(rawData.summaries)) {
             throw new Error("관련된 최신 뉴스를 찾을 수 없습니다.");
        }

        const summaries: NewsSummary[] = rawData.summaries.map((item: any) => {
            // 1. Image Generation Logic
            const seedStr = (item.title || "") + (item.summary ? item.summary.slice(0, 10) : "");
            const seed = hashCode(seedStr);

            // Construct a robust prompt: User keywords + Style boosters
            // We force "news photography" style.
            let keywords = item.imageKeywords;
            if (!keywords || keywords.length < 3) {
                // Fallback if AI didn't give good keywords
                keywords = "breaking news, journalism, detailed, realistic";
            }

            const finalImagePrompt = `${keywords}, news photography, realistic, 4k, cinematic lighting`;
            const encodedPrompt = encodeURIComponent(finalImagePrompt);

            // Use 'flux' model for best results.
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=512&model=flux&nologo=true&seed=${seed}`;

            // 2. Link Logic
            const rawLinks = Array.isArray(item.relatedArticles) ? item.relatedArticles : [];
            const badDomains = ['namu.wiki', 'youtube.com', 'dcinside.com', 'fmkorea.com', 'facebook.com', 'twitter.com', 'instagram.com', 'wikipedia.org'];

            const safeLinks = rawLinks.filter((article: any) => {
                if (!article.url || !article.url.startsWith('http')) return false;
                if (article.url.endsWith('...')) return false;
                if (badDomains.some(d => article.url.includes(d))) return false;
                return true;
            });

            // Whitelist for prioritization (Security: Trusted Sources)
            const trustedDomains = [
                'naver.com', 'daum.net', 'kakao.com', 'yna.co.kr', 'chosun.com', 'joongang.co.kr', 'donga.com',
                'hani.co.kr', 'khan.co.kr', 'mk.co.kr', 'hankyung.com', 'mt.co.kr', 'fnnews.com', 'etnews.com',
                'zdnet.co.kr', 'kbs.co.kr', 'imbc.com', 'sbs.co.kr', 'jtbc.co.kr', 'ytn.co.kr', 'yonhapnewstv.co.kr',
                'news1.kr', 'newsis.com', 'nocutnews.co.kr', 'seoul.co.kr', 'segye.com', 'kmib.co.kr',
                'cnn.com', 'bbc.com', 'reuters.com', 'bloomberg.com', 'apnews.com', 'nytimes.com', 'wsj.com'
            ];

            let finalLinks = safeLinks.filter((article: any) =>
                trustedDomains.some(domain => article.url.includes(domain))
            );

            // Ensure at least 1 link if possible (Fallback to non-blacklisted safe links)
            if (finalLinks.length === 0 && safeLinks.length > 0) {
                finalLinks = [safeLinks[0]];
            }

            const links = finalLinks.slice(0, 2).map((article: any) => ({
                title: article.headline || article.title || "관련 기사 보기",
                url: article.url
            }));

            return {
                title: item.title,
                summary: item.summary,
                imageUrl: imageUrl,
                links: links
            };
        });

        return {
            summaries: summaries,
            recommendations: rawData.recommendations || []
        };

    } catch (e) {
        console.error("Gemini API Error:", e);
        throw new Error("뉴스 정보를 가져오는데 실패했습니다.");
    }
};
