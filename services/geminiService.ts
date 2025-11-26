// geminiService.ts - 프로덕션용 (Vercel Serverless Functions 사용)

interface GeminiMessage {
  role: string;
  parts: { text: string }[];
}

interface GeminiRequestBody {
  messages: GeminiMessage[];
  tools?: any[];
}

// API 엔드포인트 결정
const getApiEndpoint = () => {
  // 개발 환경에서는 localhost, 프로덕션에서는 /api 사용
  return import.meta.env.DEV 
    ? 'http://localhost:5173/api/gemini'
    : '/api/gemini';
};

// 메인 함수: 뉴스 검색 및 요약
export async function fetchNewsSummary(keyword: string): Promise<any> {
  try {
    const prompt = `
당신은 전문 뉴스 브리핑 AI입니다. "${keyword}"에 대한 최신 뉴스를 검색하여 다음 형식으로 정리해주세요:

[검색 조건]
- 신뢰할 수 있는 언론사 (조선일보, 중앙일보, 한겨레, 경향신문, MBC, KBS, SBS, 연합뉴스, YTN, JTBC 등)의 기사만 선택
- 최근 24시간 이내의 기사 우선
- 광고성 콘텐츠 제외

[출력 형식 - 반드시 JSON만 출력]
\`\`\`json
{
  "news": [
    {
      "title": "뉴스 제목",
      "summary": "3-5줄로 핵심 내용 요약",
      "source": "언론사명",
      "url": "기사 원문 링크 (실제 존재하는 링크)",
      "timestamp": "발행 시간"
    }
  ]
}
\`\`\`

중요: 
1. 반드시 실제 존재하는 기사만 포함
2. URL은 정확해야 함
3. 3-5개의 뉴스로 제한
4. JSON 형식만 출력 (다른 텍스트 포함 금지)
`;

    const messages: GeminiMessage[] = [{
      role: 'user',
      parts: [{ text: prompt }]
    }];

    const requestBody: GeminiRequestBody = {
      messages,
      tools: [{
        googleSearch: {}
      }]
    };

    const apiEndpoint = getApiEndpoint();
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API 요청 실패');
    }

    const data = await response.json();
    
    // Gemini API 응답 파싱
    if (data.candidates && data.candidates[0]?.content?.parts) {
      const textPart = data.candidates[0].content.parts.find(
        (part: any) => part.text
      );
      
      const responseText = textPart?.text || '';
      
      // JSON 추출 (```json ... ``` 형식에서)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // 직접 JSON 파싱 시도
      try {
        return JSON.parse(responseText);
      } catch {
        throw new Error('JSON 형식이 올바르지 않습니다');
      }
    }

    throw new Error('응답 형식이 올바르지 않습니다');

  } catch (error: any) {
    console.error('Gemini Service Error:', error);
    throw new Error(error.message || '뉴스 검색 중 오류가 발생했습니다');
  }
}

// 클래스 기반 (기존 코드 호환성 유지)
export class GeminiService {
  async searchAndSummarizeNews(keyword: string): Promise<any> {
    return fetchNewsSummary(keyword);
  }
}

// 싱글톤 인스턴스
export const geminiService = new GeminiService();