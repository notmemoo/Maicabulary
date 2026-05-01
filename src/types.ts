export interface Word {
  id?: string;
  word: string;
  definition: string;
  example: string;
  pronunciation?: string;
  part_of_speech: string;
  date_shown?: string;
}

export interface DailyWordsState {
  words: Word[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
}
