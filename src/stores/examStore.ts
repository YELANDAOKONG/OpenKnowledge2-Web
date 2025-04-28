import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Examination, Question, QuestionScore, ScoreRecord, QuestionTypes } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

interface ExamState {
    currentExam: Examination | null;
    scoreRecord: ScoreRecord | null;
    examInProgress: boolean;
    loadExam: (exam: Examination) => void;
    updateUserAnswer: (sectionIndex: number, questionIndex: number, answer: string[]) => void;
    startExam: () => void;
    endExam: () => void;
    calculateScores: () => void;
    resetExam: () => void;
}

const createEmptyScoreRecord = (): ScoreRecord => ({
    Id: uuidv4(),
    ExamId: '',
    ExamTitle: '',
    UserId: 'local-user',
    UserName: 'Local User',
    Timestamp: new Date().toISOString(),
    TotalScore: 0,
    ObtainedScore: 0,
    SectionScores: {},
    QuestionScores: {},
});

export const useExamStore = create<ExamState>()(
    persist(
        (set, get) => ({
            currentExam: null,
            scoreRecord: null,
            examInProgress: false,

            loadExam: (exam) => set({
                currentExam: exam,
                scoreRecord: {
                    ...createEmptyScoreRecord(),
                    ExamId: exam.ExaminationMetadata.ExamId || '',
                    ExamTitle: exam.ExaminationMetadata.Title,
                    TotalScore: exam.ExaminationMetadata.TotalScore,
                }
            }),

            updateUserAnswer: (sectionIndex, questionIndex, answer) => {
                const { currentExam } = get();
                if (!currentExam) return;

                // Create a deep copy to avoid direct state mutation
                const updatedExam = JSON.parse(JSON.stringify(currentExam)) as Examination;

                // Update the answer
                if (updatedExam.ExaminationSections[sectionIndex]?.Questions?.[questionIndex]) {
                    updatedExam.ExaminationSections[sectionIndex].Questions![questionIndex].UserAnswer = answer;
                }

                set({ currentExam: updatedExam });
            },

            startExam: () => set({ examInProgress: true }),

            endExam: () => {
                const { calculateScores } = get();
                calculateScores();
                set({ examInProgress: false });
            },

            calculateScores: () => {
                const { currentExam } = get();
                if (!currentExam) return;

                const scoreRecord = get().scoreRecord || createEmptyScoreRecord();
                scoreRecord.TotalScore = currentExam.ExaminationMetadata.TotalScore;
                let totalObtained = 0;

                // Reset scores
                scoreRecord.SectionScores = {};
                scoreRecord.QuestionScores = {};

                // Calculate scores for each section
                currentExam.ExaminationSections.forEach((section) => {
                    if (!section.Questions) return;

                    const sectionId = section.SectionId || section.Title;
                    let sectionScore = 0;
                    const sectionQuestionScores: Record<string, QuestionScore> = {};

                    section.Questions.forEach((question) => {
                        if (!question.QuestionId) return;

                        let questionScore = 0;
                        let isCorrect = false;

                        // Only calculate scores for non-AI judged questions
                        if (!question.IsAiJudge) {
                            isCorrect = isAnswerCorrect(question);
                            questionScore = isCorrect ? question.Score : 0;
                        } else {
                            // For AI-judged questions, we'll need to set this later
                            questionScore = 0;
                        }

                        // Add to question scores
                        sectionQuestionScores[question.QuestionId] = {
                            QuestionId: question.QuestionId,
                            MaxScore: question.Score,
                            ObtainedScore: questionScore,
                            IsCorrect: isCorrect,
                        };

                        // Add to section score
                        sectionScore += questionScore;
                    });

                    // Add to section scores
                    scoreRecord.SectionScores[sectionId] = sectionScore;
                    scoreRecord.QuestionScores[sectionId] = sectionQuestionScores;

                    // Add to total score
                    totalObtained += sectionScore;
                });

                scoreRecord.ObtainedScore = totalObtained;
                scoreRecord.Timestamp = new Date().toISOString();

                set({ scoreRecord });
            },

            resetExam: () => set({
                currentExam: null,
                scoreRecord: null,
                examInProgress: false
            }),
        }),
        {
            name: 'exam-storage',
        }
    )
);

// Helper function to check if an answer is correct
function isAnswerCorrect(question: Question): boolean {
    if (!question.UserAnswer || question.UserAnswer.length === 0 || !question.Answer || question.Answer.length === 0) {
        return false;
    }

    switch (question.Type) {
        case QuestionTypes.SingleChoice:
            return question.UserAnswer[0].trim().toLowerCase() === question.Answer[0].trim().toLowerCase();

        case QuestionTypes.MultipleChoice:
            // All selected options must match exactly
            if (question.UserAnswer.length !== question.Answer.length) {
                return false;
            }

            const userOptions = new Set(question.UserAnswer.map(a => a.trim().toLowerCase()));
            const correctOptions = new Set(question.Answer.map(a => a.trim().toLowerCase()));

            // Check if sets are equal
            return [...userOptions].every(opt => correctOptions.has(opt)) &&
                [...correctOptions].every(opt => userOptions.has(opt));

        case QuestionTypes.Judgment:
            return question.UserAnswer[0].trim().toLowerCase() === question.Answer[0].trim().toLowerCase();

        case QuestionTypes.FillInTheBlank:
            return question.UserAnswer[0].trim().toLowerCase() === question.Answer[0].trim().toLowerCase();

        default:
            return false; // Complex types require AI judgment
    }
}
