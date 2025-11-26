// geminiService.ts - 프로덕션용 (강력한 응답 파싱)

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
  return import.meta.env.DEV 
    ? 'http://localhost:5173/api/gemini'
    : '/api/gemini';
};

// 응답에서 텍스트 추출 (여러 형식 지원)
function extractTextFromResponse(data: any): string {
  // 케이스 1: candidates 배열이 있는 경우
  if (data.candidates && Array.isArray(data.candidates)) {
    for (const candidate of data.candidates) {
      // content.parts 구조
      if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            return part.text;
          }
        }
      }
      
      // 직접 text 필드가 있는 경우
      if (candidate.text) {
        return candidate.text;
      }
    }
  }
  
  // 케이스 2: 직접 text 필드
  if (data.text) {
    return data.text;
  }
  
  // 케이스 3: content.text 구조
  if (data.content?.text) {
    return data.content.text;
  }
  
  return '';
}

// JSON 추출 (마크다운 코드 블록에서)
function extractJSON(text: string): any {
  // ```json ... ``` 형식
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('JSON parse error from markdown:', e);
    }
  }
  
  // ``` ... ``` 형식 (json 키워드 없음)
  const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (codeMatch) {
    try {
      return JSON.parse(codeMatch[1]);
    } catch (e) {
      console.error('JSON parse error from code block:', e);
    }
  }
  
  // 직접 JSON 파싱 시도
  try {
    return JSON.parse(text);
  } catch (e) {
    // JSON이 아닌 경우 - 텍스트 그대로 반환
    console.warn('Response is not JSON, returning as text');
    return null;
  }
}

// 메인 함수: 뉴스 검색 및 요약
export async function fetchNewsSummary(keyword: string): Promise<any> {
  try {
    const prompt = `
당신은 전문 뉴스 브리핑 AI입니다. "${keyword}"에 대한 최신 뉴스를 검색하여 정리해주세요.

[검색 조건]
- 신뢰할 수 있는 한국 언론사 (조선일보, 중앙일보, 한겨레, 경향신문, MBC, KBS, SBS, 연합뉴스, YTN, JTBC 등)
- 최근 24시간 이내의 기사 우선
- 광고성 콘텐츠 제외
- 3-5개의 뉴스

[중요: 반드시 아래 JSON 형식만 출력하세요]
\`\`\`json
{
  "news": [
    {
      "title": "뉴스 제목",
      "summary": "3-5줄로 핵심 내용 요약. 문장은 명확하게 끝나야 합니다.",
      "source": "언론사명",
      "url": "https://실제존재하는기사링크.com",
      "timestamp": "YYYY-MM-DD HH:MM"
    }
  ]
}
\`\`\`

[필수 규칙]
1. JSON 형식만 출력 (다른 텍스트 절대 금지)
2. 실제 존재하는 기사 URL만 포함
3. summary는 반드시 한국어 문장으로 끝나야 함 (예: "~입니다.", "~했습니다.")
4. 최소 3개, 최대 5개의 뉴스
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
    
    console.log('Calling Gemini API...');
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API 요청 실패 (${response.status})`);
    }

    const data = await response.json();
    console.log('Gemini API response received');
    
    // 응답에서 텍스트 추출
    const responseText = extractTextFromResponse(data);
    
    if (!responseText) {
      console.error('Response data:', JSON.stringify(data, null, 2));
      throw new Error('응답에서 텍스트를 찾을 수 없습니다');
    }
    
    console.log('Extracted text length:', responseText.length);
    
    // JSON 추출 및 파싱
    const jsonData = extractJSON(responseText);
    
    if (!jsonData) {
      console.error('Failed to parse JSON from response:', responseText.substring(0, 500));
      throw new Error('JSON 형식이 올바르지 않습니다. AI가 텍스트만 반환했습니다.');
    }
    
    // 뉴스 배열 확인
    if (!jsonData.news || !Array.isArray(jsonData.news)) {
      console.error('Invalid JSON structure:', jsonData);
      throw new Error('뉴스 데이터 구조가 올바르지 않습니다');
    }
    
    if (jsonData.news.length === 0) {
      throw new Error('검색된 뉴스가 없습니다. 다른 키워드로 시도해주세요.');
    }
    
    console.log(`Successfully parsed ${jsonData.news.length} news items`);
    return jsonData;

  } catch (error: any) {
    console.error('Gemini Service Error:', error);
    
    // 사용자 친화적 에러 메시지
    if (error.message.includes('JSON')) {
      throw new Error('AI 응답 형식 오류입니다. 잠시 후 다시 시도해주세요.');
    }
    
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