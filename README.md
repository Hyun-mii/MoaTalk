# 📱 MoaTalk (Audio-First AI 뉴스 플랫폼)

> **"듣는 뉴스" 컨셉**으로 멀티태스킹 환경에서 정보 습득 효율을 극대화하기 위해 개발된 **AI 뉴스 요약 및 검색 플랫폼**입니다.

## 🛠️ 주요 기술 스택 및 특징
* **AI/LLM:** Google Gemini 2.5 Flash, Google Search Tool (Grounding)
* **프론트엔드:** React 19 (Hooks), TypeScript, Tailwind CSS
* **멀티모달:** Web Speech API (TTS 자동 재생, STT 음성 검색) 활용
* **Generative UI:** Pollinations.ai (Flux)로 동적 썸네일 생성 및 최적화

---

## ✨ 핵심 성과 (Problem Solving)

* **Audio-First 완성:** Custom Hook을 이용해 TTS 자동 재생, 이어듣기, 속도 조절 등 청취 환경을 완성했습니다.
* **Generative UI 최적화:** 뉴스 제목 해시 기반 **시드 고정 전략**으로 이미지 캐싱을 유도하여 로딩 속도를 개선했습니다.
* **신뢰성 확보:** **Whitelist 기반 링크 필터링**과 **Sanitization** 함수로 404 링크 및 프롬프트 인젝션 위험을 방어했습니다.
* **결과:** 별도 DB 없이 구현되어 유지 비용이 낮으며, 실시간 웹 검색(Grounding)을 통해 정보의 최신성을 확보했습니다.
