# MoaTalk 배포 가이드

## Vercel 환경변수 설정

배포 후 Vercel 대시보드에서 다음 환경변수를 설정해야 합니다:

1. Vercel 프로젝트 페이지로 이동
2. **Settings** > **Environment Variables** 클릭
3. 다음 환경변수 추가:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**중요**:
- 환경변수를 추가한 후 **Redeploy**를 해야 적용됩니다
- API 키는 Google AI Studio (https://makersuite.google.com/app/apikey)에서 발급받을 수 있습니다

## 로컬 개발 환경 설정

1. `.env.local` 파일 생성:
```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env.local
```

2. 개발 서버 실행:
```bash
npm run dev
```

## 주요 변경사항

### 이미지 생성
- **이전**: 모든 뉴스에 동일한 Unsplash 이미지 사용
- **현재**: Pollinations.ai API를 사용하여 각 뉴스마다 AI가 생성한 imageKeywords 기반의 고유한 이미지 생성
- **캐싱**: 동일한 뉴스 제목/요약은 동일한 이미지를 생성 (해시 기반 시드)

### API 호출 방식
- **이전**: 서버사이드 API (`/api/gemini`) 사용
- **현재**: 클라이언트에서 직접 Gemini API 호출 (`@google/genai` SDK)

### 보안
- 입력값 살균 처리 (Prompt Injection 방지)
- 신뢰할 수 있는 뉴스 도메인 필터링
- 악성 링크 차단

## 트러블슈팅

### "API Key not found" 에러
- Vercel 환경변수가 제대로 설정되었는지 확인
- Redeploy 후 다시 시도

### 이미지가 로드되지 않음
- Pollinations.ai API가 일시적으로 느릴 수 있음
- 브라우저 캐시 삭제 후 재시도

### 번들 크기 증가
- 클라이언트 사이드 Gemini SDK 포함으로 번들 크기가 증가했습니다 (~220KB 추가)
- 필요시 코드 스플리팅을 고려할 수 있습니다
