import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Table, Progress, Space, Divider, Spin, Tag, message } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DownloadOutlined,
    RobotOutlined,
    SyncOutlined
} from '@ant-design/icons';
import { useExamStore } from '../stores/examStore';
import { useConfigStore } from '../stores/configStore';
import {Examination, Question, QuestionTypes, ScoreRecord} from '../models/types';
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

    // Function to generate downloadable exam with answers
    const generateExamWithAnswers = (exam: Examination, scoreRecord: ScoreRecord): string => {
        let content = `# ${exam.ExaminationMetadata.Title}\n\n`;
        content += `Score: ${scoreRecord.ObtainedScore}/${scoreRecord.TotalScore}\n`;
        content += `Date: ${new Date(scoreRecord.Timestamp).toLocaleString()}\n\n`;

        exam.ExaminationSections.forEach((section, sectionIndex) => {
            content += `## ${section.Title}\n\n`;

            if (section.Description) {
                content += `${section.Description}\n\n`;
            }

            section.Questions?.forEach((question, questionIndex) => {
                const questionId = question.QuestionId || `q-${sectionIndex}-${questionIndex}`;
                const sectionId = section.SectionId || section.Title;
                const questionScore = scoreRecord.QuestionScores[sectionId]?.[questionId];

                content += `### Question ${questionIndex + 1} (${question.Score} points)\n\n`;
                content += `${question.Stem}\n\n`;

                // Add options if applicable
                if (question.Options && question.Options.length > 0) {
                    content += "Options:\n";
                    question.Options.forEach(option => {
                        content += `- ${option.Item1}: ${option.Item2}\n`;
                    });
                    content += "\n";
                }

                // Add user's answer
                content += "Your Answer:\n";
                if (question.UserAnswer && question.UserAnswer.length > 0) {
                    content += `${question.UserAnswer.join(", ")}\n\n`;
                } else {
                    content += "No answer provided\n\n";
                }

                // Add correct answer
                content += "Correct Answer:\n";
                content += `${question.Answer.join(", ")}\n\n`;

                // Add score information
                if (questionScore) {
                    content += `Score: ${questionScore.ObtainedScore}/${questionScore.MaxScore}\n`;
                    content += `Status: ${questionScore.IsCorrect ? "Correct" : "Incorrect"}\n\n`;
                }

                // Add AI feedback if available
                if (question.IsAiJudge && questionScore) {
                    const feedbackId = question.QuestionId || '';
                    const feedback = aiGradingResults[feedbackId];
                    if (feedback) {
                        content += "AI 反馈：\n";
                        content += `${feedback}\n\n`;
                    }
                }

                content += "---\n\n";
            });
        });

        return content;
    };

    // Function to trigger download
    const downloadExamWithAnswers = () => {
        if (!currentExam || !scoreRecord) return;

        const content = generateExamWithAnswers(currentExam, scoreRecord);
        const fileName = `${currentExam.ExaminationMetadata.Title.replace(/\s+/g, '_')}_Answers.md`;

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        message.success('Exam with answers downloaded successfully');
    };

    const downloadExamJson = () => {
        if (!currentExam) return;

        const examWithAnswers = JSON.stringify(currentExam, null, 2);
        const fileName = `${currentExam.ExaminationMetadata.Title.replace(/\s+/g, '_')}_with_answers.json`;

        const blob = new Blob([examWithAnswers], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        message.success('Exam with answers downloaded successfully');
    };


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
        // 先检查配置是否完整
        if (!config.OpenAiApiUrl || !config.OpenAiApiKey ||
            config.OpenAiApiUrl.trim() === '' ||
            config.OpenAiApiKey.trim() === '') {
            message.error('OpenAI API not configured. Please go to Settings page to configure it.');
            return;
        }
        if (!openAIService.isInitialized()) {
            try {
                console.log("Attempting to initialize OpenAI service with:", {
                    url: config.OpenAiApiUrl,
                    hasKey: !!config.OpenAiApiKey,
                    model: config.OpenAiModel
                });

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
            title: '章节',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: '分数',
            key: 'score',
            render: (_text: unknown, record: { score: number; maxScore: number }) =>
                `${record.score} / ${record.maxScore}`,
        },
        {
            title: '百分比',
            key: 'percentage',
            render: (_text: unknown, record: { percentage: number }) => (
                <Progress percent={record.percentage} status={record.percentage >= 60 ? 'success' : 'exception'} />
            ),
        },
    ];

    // Question table columns
    const questionColumns = [
        {
            title: '章节',
            dataIndex: 'sectionTitle',
            key: 'sectionTitle',
            width: 150,
        },
        {
            title: '题目',
            dataIndex: 'stem',
            key: 'stem',
            render: (text: string) => (
                <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {text}
                </div>
            ),
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 120,
        },
        {
            title: '分数',
            key: 'score',
            width: 100,
            render: (_text: unknown, record: { score: number; maxScore: number }) =>
                `${record.score} / ${record.maxScore}`,
        },
        {
            title: '状态',
            key: 'status',
            width: 120,
            render: (_text: unknown, record: {
                isAiGraded: boolean;
                status?: 'pending' | 'completed' | 'error';
                isCorrect: boolean
            }) => {
                if (record.isAiGraded) {
                    if (!record.status || record.status === 'pending') {
                        return <Tag icon={<SyncOutlined spin />} color="processing">AI 待处理...</Tag>;
                    } else if (record.status === 'completed') {
                        return <Tag icon={<RobotOutlined />} color="success">AI 已评分</Tag>;
                    } else {
                        return <Tag icon={<CloseCircleOutlined />} color="error">评分出错</Tag>;
                    }
                } else {
                    return record.isCorrect
                        ? <Tag icon={<CheckCircleOutlined />} color="success">正确</Tag>
                        : <Tag icon={<CloseCircleOutlined />} color="error">错误</Tag>;
                }
            },
        },
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Card>
                <Title level={2}>考试结果</Title>
                <Paragraph>
                    试卷： {currentExam.ExaminationMetadata.Title}
                </Paragraph>
                <Paragraph>
                   协议版本： {currentExam.ExaminationVersion.Major}.{currentExam.ExaminationVersion.Minor}.{currentExam.ExaminationVersion.Patch}
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
                                ? '恭喜！你通过了考试。'
                                : '你没有通过考试。继续努力！'}
                        </Text>
                    </div>
                </Card>

                {aiGradedQuestions.length > 0 && (
                    <Card title="AI 评分" style={{ marginBottom: 24 }}>
                        <Paragraph>
                            此试卷包含 {aiGradedQuestions.length} 个问题需要 AI 评分。
                        </Paragraph>

                        <Button
                            type="primary"
                            icon={<RobotOutlined />}
                            onClick={startAiGrading}
                            loading={aiGradingInProgress}
                            disabled={aiGradingInProgress}
                        >
                            {Object.values(gradingStatus).some(status => status === 'completed')
                                ? '继续 AI 评分'
                                : '开始 AI 评分'}
                        </Button>
                    </Card>
                )}

                <Divider orientation="left">章节分数</Divider>
                <Table
                    dataSource={sectionData}
                    columns={sectionColumns}
                    pagination={false}
                    style={{ marginBottom: 24 }}
                />

                <Divider orientation="left">题目详情</Divider>
                <Table
                    dataSource={questionData}
                    columns={questionColumns}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div>
                                <p><strong>你的答案：</strong> {record.userAnswer || '未提供答案'}</p>
                                <p><strong>正确答案：</strong> {record.correctAnswer}</p>
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
                            回到主页
                        </Button>
                        <Button type="primary" onClick={() => window.print()}>
                            打印结果
                        </Button>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={downloadExamJson}
                        >
                            下载带有答案的试卷文件
                        </Button>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={downloadExamWithAnswers}
                        >
                            下载试卷 Markdown
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
        case QuestionTypes.SingleChoice: return '单选题';
        case QuestionTypes.MultipleChoice: return '多选题';
        case QuestionTypes.Judgment: return '判断题';
        case QuestionTypes.FillInTheBlank: return '填空题';
        case QuestionTypes.Math: return '数学题';
        case QuestionTypes.Essay: return '作文题';
        case QuestionTypes.ShortAnswer: return '简答题';
        case QuestionTypes.Calculation: return '计算题';
        case QuestionTypes.Complex: return '符合题';
        case QuestionTypes.Other: return '其他';
        default: return '未知';
    }
}

export default ResultsPage;
