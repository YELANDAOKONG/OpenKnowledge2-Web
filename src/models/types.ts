// 修改接口定义中的属性名称，使用 PascalCase 与 C# 保持一致
export interface ExaminationVersion {
    Major: number;
    Minor: number;
    Patch: number;
}

export interface ReferenceMaterialImage {
    Type: ReferenceMaterialImageTypes;
    Uri: string | null;
    Image: string | null; // base64 string for binary data
}

export enum ReferenceMaterialImageTypes {
    Unknown = 0,
    Local = 1,
    Remote = 2,
    Embedded = 3,
}

export interface ReferenceMaterial {
    Materials: string[];
    Images: ReferenceMaterialImage[] | null;
}

export interface ExaminationMetadata {
    ExamId: string | null;
    Title: string;
    Description: string | null;
    Subject: string | null;
    Language: string | null;
    TotalScore: number;
    ReferenceMaterials: ReferenceMaterial[] | null;
}

export enum QuestionTypes {
    Unknown = 0,
    SingleChoice = 1,
    MultipleChoice = 2,
    Judgment = 3,
    FillInTheBlank = 4,
    Math = 5,
    Essay = 6,
    ShortAnswer = 7,
    Calculation = 8,
    Complex = 9,
    Other = 10,
}

// Update Option interface to support both formats
export interface Option {
    Id?: string;
    Text?: string;
    Item1?: string;
    Item2?: string;
}

// Update Question interface to use new Option type
export interface Question {
    QuestionId: string | null;
    Type: QuestionTypes;
    Stem: string;
    Options: Option[] | null; // Changed from Array<{Item1: string, Item2: string}> | null
    Score: number;
    UserAnswer?: string[] | null;
    Answer: string[];
    ReferenceAnswer?: string[] | null;
    ReferenceMaterials?: ReferenceMaterial[] | null;
    IsAiJudge: boolean;
    Commits?: string[] | null;
    SubQuestions?: Question[] | null;
}

export interface ExaminationSection {
    SectionId: string | null;
    Title: string;
    Description: string | null;
    ReferenceMaterials: ReferenceMaterial[] | null;
    Score: number | null;
    Questions: Question[] | null;
}

export interface Examination {
    ExaminationVersion: ExaminationVersion;
    ExaminationMetadata: ExaminationMetadata;
    ExaminationSections: ExaminationSection[];
}

export interface QuestionScore {
    QuestionId: string;
    MaxScore: number;
    ObtainedScore: number;
    IsCorrect: boolean;
}

export interface ScoreRecord {
    Id: string;
    ExamId: string;
    ExamTitle: string;
    UserId: string;
    UserName: string;
    Timestamp: string;
    TotalScore: number;
    ObtainedScore: number;
    SectionScores: Record<string, number>;
    QuestionScores: Record<string, Record<string, QuestionScore>>;
}

export interface SystemConfig {
    OpenAiApiUrl: string | null;
    OpenAiApiKey: string | null;
    OpenAiModel: string | null;
    OpenAiModelTemperature: number | null;
}

export interface AIGradingResult {
    isCorrect: boolean;
    score: number;
    maxScore: number;
    confidenceLevel: number;
    dimensions?: Array<{
        name: string;
        score: number;
        maxScore: number;
    }>;
    feedback: string;
}

export const CURRENT_PROTOCOL_VERSION = {
    Major: 2,
    Minor: 1,
    Patch: 0
};