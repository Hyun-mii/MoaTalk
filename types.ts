
export interface ArticleLink {
  title: string;
  url: string;
}

export interface NewsSummary {
  title: string;
  summary: string;
  imageUrl: string;
  links: ArticleLink[];
}

export interface AppData {
  summaries: NewsSummary[];
  recommendations: string[];
}

export interface HistoryItem {
  id: string;
  query: string;
  date: string; // ISO String or formatted date
  timestamp: number;
  data: AppData;
}
