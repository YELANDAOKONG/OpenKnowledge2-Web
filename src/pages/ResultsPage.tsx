import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Table, Progress, Space, Divider, Spin, Tag, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, RobotOutlined, SyncOutlined } from '@ant-design/icons';
import { useExamStore } from '../stores/examStore';
import { useConfigStore } from '../stores/configStore';
import { Question, QuestionTypes } from '../models/types';
import { openAIService } from '../services/openaiService';

const { Title, Paragraph, Text } = Typography;

const ResultsPage = () => {
    const navigate = useNavigate();
    const { currentExam, scoreRecord, examInProgress } = useExamStore();
    const { config } = useConfigStore();

    const [aiGradingInProgress, setAiGradingInProgress] = useState(false);
    const [gradingStatus, setGradingStatus] = useState<Record<string, 'pending' | 'completed' | 'error'>>({});
    const [aiGradingResults, setAiGradingResults] = useState<Record<string, string>>({});

    // Redirect if no exam or still in progress
    useEffect(() => {
        if (!currentExam || examInProgress) {
            navigate('/');
        }
    }, [currentExam, examInProgress, navigate]);

    if (!currentExam || !scoreRecord) {
        return <Spin size="large" />;
    }

    const calculateAiGradedQuestions = () => {
        const aiQuestions: Array<{
            sectionIndex: number;
            questionIndex: number;
            question: Question;
        }> = [];

        currentExam.ExaminationSections.forEach((section, sectionIndex) => {
            section.Questions?.forEach((question, questionIndex) => {
                if (question.IsAiJudge && question.UserAnswer && question.UserAnswer.length > 0) {
                    aiQuestions.push({
                        sectionIndex,
                        questionIndex,
                        question,
                    });
                }
            });
        });

        return aiQuestions;
    };

    const aiGradedQuestions = calculateAiGradedQuestions();

    const startAiGrading = async () => {
        if (!openAIService.isInitialized()) {
            try {
                openAIService.initialize(config);
            } catch (error) {
                console.error('Failed to initialize OpenAI service:', error);
                message.error('Failed to initialize AI grading. Please check your API configuration.');
                return;
            }
        }

        setAiGradingInProgress(true);

        // Initialize grading status for all AI questions
        const initialStatus: Record<string, 'pending' | 'completed' | 'error'> = {};
        aiGradedQuestions.forEach(({ question }) => {
            if (question.QuestionId) {
                initialStatus[question.QuestionId] = 'pending';
            }
        });
        setGradingStatus(initialStatus);

        // Grade each question sequentially
        for (const { question } of aiGradedQuestions) {
            if (!question.QuestionId) continue;

            try {
                // Call OpenAI to grade the question
                const result = await openAIService.gradeQuestion(question, config);

                // Update the score in the exam
                updateQuestionScore(question.QuestionId, result.score);

                // Update grading status
                setGradingStatus(prev => ({
                    ...prev,
                    [question.QuestionId!]: 'completed'
                }));

                // Store AI feedback
                setAiGradingResults(prev => ({
                    ...prev,
                    [question.QuestionId!]: result.feedback
                }));

            } catch (error) {
                console.error('AI grading error for question', question.QuestionId, error);

                // Update grading status to error
                setGradingStatus(prev => ({
                    ...prev,
                    [question.QuestionId!]: 'error'
                }));

                message.error(`Failed to grade question ${question.QuestionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        setAiGradingInProgress(false);
    };

    const updateQuestionScore = (questionId: string, score: number) => {
        // Find the question in the score record
        for (const sectionId in scoreRecord.QuestionScores) {
            const sectionScores = scoreRecord.QuestionScores[sectionId];

            if (sectionScores[questionId]) {
                // Update the question score
                sectionScores[questionId].ObtainedScore = score;
                sectionScores[questionId].IsCorrect = Math.abs(score - sectionScores[questionId].MaxScore) < 0.001;

                // Recalculate section score
                let newSectionScore = 0;
                for (const qId in sectionScores) {
                    newSectionScore += sectionScores[qId].ObtainedScore;
                }
                scoreRecord.SectionScores[sectionId] = newSectionScore;

                // Recalculate total score
                let newTotalScore = 0;
                for (const secId in scoreRecord.SectionScores) {
                    newTotalScore += scoreRecord.SectionScores[secId];
                }
                scoreRecord.ObtainedScore = newTotalScore;

                break;
            }
        }
    };

    // Prepare data for the section scores table
    const sectionData = currentExam.ExaminationSections.map((section, index) => {
        const sectionId = section.SectionId || section.Title;
        const obtainedScore = scoreRecord.SectionScores[sectionId] || 0;
        const maxScore = section.Score ||
            (section.Questions?.reduce((acc, q) => acc + q.Score, 0) || 0);

        return {
            key: index,
            sectionId,
            title: section.Title,
            score: obtainedScore,
            maxScore,
            percentage: maxScore > 0 ? Math.round((obtainedScore / maxScore) * 100) : 0,
        };
    });

    // Prepare data for the questions table
    const questionData: Array<{
        key: string;
        sectionTitle: string;
        questionId: string;
        stem: string;
        type: string;
        userAnswer: string;
        correctAnswer: string;
        score: number;
        maxScore: number;
        isCorrect: boolean;
        isAiGraded: boolean;
        status?: 'pending' | 'completed' | 'error';
        feedback?: string;
    }> = [];

    currentExam.ExaminationSections.forEach(section => {
        const sectionId = section.SectionId || section.Title;

        section.Questions?.forEach(question => {
            if (!question.QuestionId) return;

            const questionScores = scoreRecord.QuestionScores[sectionId]?.[question.QuestionId];

            if (!questionScores) return;

            questionData.push({
                key: question.QuestionId,
                sectionTitle: section.Title,
                questionId: question.QuestionId,
                stem: question.Stem,
                type: getQuestionTypeText(question.Type),
                userAnswer: (question.UserAnswer || []).join(', '),
                correctAnswer: question.Answer.join(', '),
                score: questionScores.ObtainedScore,
                maxScore: questionScores.MaxScore,
                isCorrect: questionScores.IsCorrect,
                isAiGraded: question.IsAiJudge,
                status: question.IsAiJudge ? gradingStatus[question.QuestionId] : undefined,
                feedback: question.IsAiJudge ? aiGradingResults[question.QuestionId] : undefined,
            });
        });
    });

    // Section table columns
    const sectionColumns = [
        {
            title: 'Section',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Score',
            key: 'score',
            render: (_text: unknown, record: { score: number; maxScore: number }) =>
                `${record.score} / ${record.maxScore}`,
        },
        {
            title: 'Percentage',
            key: 'percentage',
            render: (_text: unknown, record: { percentage: number }) => (
                <Progress percent={record.percentage} status={record.percentage >= 60 ? 'success' : 'exception'} />
            ),
        },
    ];

    // Question table columns
    const questionColumns = [
        {
            title: 'Section',
            dataIndex: 'sectionTitle',
            key: 'sectionTitle',
            width: 150,
        },
        {
            title: 'Question',
            dataIndex: 'stem',
            key: 'stem',
            render: (text: string) => (
                <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {text}
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 120,
        },
        {
            title: 'Score',
            key: 'score',
            width: 100,
            render: (_text: unknown, record: { score: number; maxScore: number }) =>
                `${record.score} / ${record.maxScore}`,
        },
        {
            title: 'Status',
            key: 'status',
            width: 120,
            render: (_text: unknown, record: {
                isAiGraded: boolean;
                status?: 'pending' | 'completed' | 'error';
                isCorrect: boolean
            }) => {
                if (record.isAiGraded) {
                    if (!record.status || record.status === 'pending') {
                        return <Tag icon={<SyncOutlined spin />} color="processing">Pending AI</Tag>;
                    } else if (record.status === 'completed') {
                        return <Tag icon={<RobotOutlined />} color="success">AI Graded</Tag>;
                    } else {
                        return <Tag icon={<CloseCircleOutlined />} color="error">Grading Error</Tag>;
                    }
                } else {
                    return record.isCorrect
                        ? <Tag icon={<CheckCircleOutlined />} color="success">Correct</Tag>
                        : <Tag icon={<CloseCircleOutlined />} color="error">Incorrect</Tag>;
                }
            },
        },
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Card>
                <Title level={2}>Examination Results</Title>
                <Paragraph>
                    Exam: {currentExam.ExaminationMetadata.Title}
                </Paragraph>

                <Card style={{ marginBottom: 24, textAlign: 'center' }}>
                    <Progress
                        type="dashboard"
                        percent={Math.round((scoreRecord.ObtainedScore / scoreRecord.TotalScore) * 100)}
                        status={scoreRecord.ObtainedScore >= (scoreRecord.TotalScore * 0.6) ? 'success' : 'exception'}
                        format={percent => (
                            <div>
                                <div style={{ fontSize: 24 }}>{percent}%</div>
                                <div>{scoreRecord.ObtainedScore} / {scoreRecord.TotalScore}</div>
                            </div>
                        )}
                    />

                    <div style={{ marginTop: 16 }}>
                        <Text strong>
                            {scoreRecord.ObtainedScore >= (scoreRecord.TotalScore * 0.6)
                                ? 'Congratulations! You passed the exam.'
                                : 'You did not pass the exam. Keep practicing!'}
                        </Text>
                    </div>
                </Card>

                {aiGradedQuestions.length > 0 && (
                    <Card title="AI Grading" style={{ marginBottom: 24 }}>
                        <Paragraph>
                            This exam contains {aiGradedQuestions.length} question(s) that require AI grading.
                        </Paragraph>

                        <Button
                            type="primary"
                            icon={<RobotOutlined />}
                            onClick={startAiGrading}
                            loading={aiGradingInProgress}
                            disabled={aiGradingInProgress}
                        >
                            {Object.values(gradingStatus).some(status => status === 'completed')
                                ? 'Continue AI Grading'
                                : 'Start AI Grading'}
                        </Button>
                    </Card>
                )}

                <Divider orientation="left">Section Scores</Divider>
                <Table
                    dataSource={sectionData}
                    columns={sectionColumns}
                    pagination={false}
                    style={{ marginBottom: 24 }}
                />

                <Divider orientation="left">Question Details</Divider>
                <Table
                    dataSource={questionData}
                    columns={questionColumns}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div>
                                <p><strong>Your Answer:</strong> {record.userAnswer || 'No answer provided'}</p>
                                <p><strong>Correct Answer:</strong> {record.correctAnswer}</p>
                                {record.feedback && (
                                    <div>
                                        <p><strong>AI Feedback:</strong></p>
                                        <div style={{ background: '#f9f9f9', padding: 8, borderRadius: 4 }}>
                                            {record.feedback}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ),
                    }}
                />

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                    <Space>
                        <Button onClick={() => navigate('/')}>
                            Return to Home
                        </Button>
                        <Button type="primary" onClick={() => window.print()}>
                            Print Results
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

// Helper function to get a human-readable question type
function getQuestionTypeText(type: QuestionTypes): string {
    switch (type) {
        case QuestionTypes.SingleChoice: return 'Single Choice';
        case QuestionTypes.MultipleChoice: return 'Multiple Choice';
        case QuestionTypes.Judgment: return 'True/False';
        case QuestionTypes.FillInTheBlank: return 'Fill in the Blank';
        case QuestionTypes.Math: return 'Math';
        case QuestionTypes.Essay: return 'Essay';
        case QuestionTypes.ShortAnswer: return 'Short Answer';
        case QuestionTypes.Calculation: return 'Calculation';
        case QuestionTypes.Complex: return 'Complex';
        case QuestionTypes.Other: return 'Other';
        default: return 'Unknown';
    }
}

export default ResultsPage;
