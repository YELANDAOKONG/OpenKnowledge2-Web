import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Upload, message, Space } from 'antd';
import { UploadOutlined, FileOutlined, ReloadOutlined } from '@ant-design/icons';
import { UploadFile } from 'antd/es/upload/interface';
import { useExamStore } from '../stores/examStore';
import { Examination } from '../models/types';
import { RcFile } from 'antd/es/upload';
import { App as AntApp } from 'antd';

const { Title, Paragraph } = Typography;

const HomePage = () => {
    const navigate = useNavigate();
    const { loadExam, startExam, currentExam, examInProgress, resetExam } = useExamStore();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const handleUpload = async () => {
        const file = fileList[0] as RcFile;
        if (!file) {
            message.error('Please select an exam file to upload');
            return;
        }
        setUploading(true);
        try {
            const text = await file.text();
            const examData = JSON.parse(text) as Examination;

            // Validate examination data with Pascal case property names
            if (!examData.ExaminationMetadata || !examData.ExaminationSections) {
                throw new Error('Invalid examination format');
            }

            // 重置当前考试状态，以确保可以加载新的
            resetExam();

            // Load the exam
            loadExam(examData);
            message.success('Exam loaded successfully');

            // Clear the file list
            setFileList([]);
            setShowUploadForm(false);

        } catch (error) {
            console.error('Failed to load exam:', error);
            message.error('Failed to load exam: ' + (error instanceof Error ? error.message : 'Invalid file format'));
        } finally {
            setUploading(false);
        }
    };

    const handleStartExam = () => {
        if (!currentExam) {
            message.error('No exam is loaded');
            return;
        }

        startExam();
        navigate('/exam');
    };

    const handleContinueExam = () => {
        navigate('/exam');
    };

    const handleViewResults = () => {
        navigate('/results');
    };

    // 添加一个加载新试卷的功能
    const handleLoadNewExam = () => {
        if (examInProgress) {
            // Modal
            modal.confirm({
                title: 'Are you sure?',
                content: 'You have an exam in progress. Loading a new exam will lose your current progress.',
                onOk: () => {
                    resetExam();
                    setShowUploadForm(true);
                }
            });
        } else {
            resetExam();
            setShowUploadForm(true);
        }
    };

    // Sample exam for demonstration
    const { modal } = AntApp.useApp(); // 获取上下文化的modal

    // 重写样例考试加载函数
    const loadSampleExam = () => {
        // 使用上下文化的modal
        modal.confirm({
            title: 'Load Sample Exam',
            content: 'This will load a sample math examination for demonstration purposes. Continue?',
            onOk: () => {
                // 首先重置当前考试
                resetExam();

                // 确保正确的数据结构
                const sampleExam: Examination = {
                    ExaminationVersion: { Major: 2, Minor: 1, Patch: 0 },
                    ExaminationMetadata: {
                        ExamId: 'sample-001',
                        Title: 'Sample Mathematics Examination',
                        Description: 'A sample exam with various question types',
                        Subject: 'Mathematics',
                        Language: 'English',
                        TotalScore: 100,
                        ReferenceMaterials: null
                    },
                    ExaminationSections: [
                        {
                            SectionId: 'section-1',
                            Title: 'Basic Arithmetic',
                            Description: 'Test your knowledge of basic arithmetic operations',
                            ReferenceMaterials: null,
                            Score: 40,
                            Questions: [
                                {
                                    QuestionId: 'q1',
                                    Type: 1, // SingleChoice
                                    Stem: 'What is 2 + 2?',
                                    Options: [
                                        {Id: 'A', Text: '3'},
                                        {Id: 'B', Text: '4'},
                                        {Id: 'C', Text: '5'},
                                        {Id: 'D', Text: '6'}
                                    ],
                                    Score: 10,
                                    Answer: ['B'],
                                    IsAiJudge: false
                                },
                                {
                                    QuestionId: 'q2',
                                    Type: 4, // FillInTheBlank
                                    Stem: 'What is the result of 5 × 7?',
                                    Options: null,
                                    Score: 10,
                                    Answer: ['35'],
                                    IsAiJudge: false
                                },
                                {
                                    QuestionId: 'q3',
                                    Type: 3, // Judgment
                                    Stem: 'Is 17 a prime number?',
                                    Options: [
                                        {Id: 'T', Text: 'True'},
                                        {Id: 'F', Text: 'False'}
                                    ],
                                    Score: 10,
                                    Answer: ['T'],
                                    IsAiJudge: false
                                },
                                {
                                    QuestionId: 'q4',
                                    Type: 7, // ShortAnswer
                                    Stem: 'Explain the concept of prime factorization and provide an example.',
                                    Options: null,
                                    Score: 10,
                                    Answer: ['Prime factorization is the process of expressing a number as a product of its prime factors.'],
                                    ReferenceAnswer: ['Prime factorization is the process of expressing a number as a product of its prime factors. For example, 24 = 2³ × 3.'],
                                    IsAiJudge: true,
                                    Commits: ['Grade based on understanding of the concept and quality of example provided.']
                                }
                            ]
                        },
                        {
                            SectionId: 'section-2',
                            Title: 'Algebra',
                            Description: 'Test your knowledge of algebraic expressions',
                            ReferenceMaterials: null,
                            Score: 60,
                            Questions: [
                                {
                                    QuestionId: 'q5',
                                    Type: 1, // SingleChoice
                                    Stem: 'Solve for x: 2x + 5 = 13',
                                    Options: [
                                        {Id: 'A', Text: 'x = 3'},
                                        {Id: 'B', Text: 'x = 4'},
                                        {Id: 'C', Text: 'x = 5'},
                                        {Id: 'D', Text: 'x = 6'}
                                    ],
                                    Score: 15,
                                    Answer: ['B'],
                                    IsAiJudge: false
                                },
                                {
                                    QuestionId: 'q6',
                                    Type: 8, // Calculation
                                    Stem: 'Simplify the expression: 3(2x - 4) + 5x',
                                    Options: null,
                                    Score: 15,
                                    Answer: ['11x - 12'],
                                    IsAiJudge: true,
                                    Commits: ['Check if the student correctly applied the distributive property and combined like terms.']
                                },
                                {
                                    QuestionId: 'q7',
                                    Type: 2, // MultipleChoice
                                    Stem: 'Which of the following are quadratic equations? Select all that apply.',
                                    Options: [
                                        {Id: 'A', Text: 'y = 2x + 3'},
                                        {Id: 'B', Text: 'y = x² - 4'},
                                        {Id: 'C', Text: 'y = 3x² + 2x - 1'},
                                        {Id: 'D', Text: 'y = x³ - 2x'}
                                    ],
                                    Score: 15,
                                    Answer: ['B', 'C'],
                                    IsAiJudge: false
                                },
                                {
                                    QuestionId: 'q8',
                                    Type: 5, // Math
                                    Stem: 'Solve the system of equations:\n3x + 2y = 12\nx - y = 1',
                                    Options: null,
                                    Score: 15,
                                    Answer: ['x = 3, y = 2'],
                                    ReferenceAnswer: ['x = 3, y = 2. Using substitution: y = x - 1, so 3x + 2(x - 1) = 12. Simplify to 3x + 2x - 2 = 12, so 5x = 14, x = 14/5 = 2.8. Then y = x - 1 = 1.8.'],
                                    IsAiJudge: true,
                                    Commits: ['Check both the answer and solution method. Award partial credit for correct approach.']
                                }
                            ]
                        }
                    ]
                };

                // 使用短暂延迟避免潜在的状态问题
                setTimeout(() => {
                    loadExam(sampleExam);
                    setShowUploadForm(false);
                    message.success('Sample exam loaded successfully');
                }, 100);
            }
        });
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Card>
                <Title level={2}>Open Knowledge Examination System</Title>
                <Paragraph>
                    Welcome to the examination system. You can upload an examination file or load a sample exam to get started.
                </Paragraph>

                {(!currentExam || showUploadForm) && (
                    <Card title="Load Examination" style={{ marginBottom: 16 }}>
                        <Upload
                            fileList={fileList}
                            beforeUpload={(file) => {
                                setFileList([file]);
                                return false;
                            }}
                            onRemove={() => {
                                setFileList([]);
                            }}
                            maxCount={1}
                            accept=".json"
                        >
                            <Button icon={<UploadOutlined />}>Select Exam File</Button>
                        </Upload>

                        <div style={{ marginTop: 16 }}>
                            <Space>
                                <Button
                                    type="primary"
                                    onClick={handleUpload}
                                    disabled={fileList.length === 0}
                                    loading={uploading}
                                >
                                    Upload
                                </Button>
                                <Button
                                    icon={<FileOutlined />}
                                    onClick={loadSampleExam}
                                >
                                    Load Sample Exam
                                </Button>
                                {showUploadForm && (
                                    <Button onClick={() => setShowUploadForm(false)}>
                                        Cancel
                                    </Button>
                                )}
                            </Space>
                        </div>
                    </Card>
                )}

                {currentExam && !showUploadForm && (
                    <Card
                        title={currentExam.ExaminationMetadata.Title}
                        style={{ marginBottom: 16 }}
                        extra={
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleLoadNewExam}
                            >
                                Load New Exam
                            </Button>
                        }
                    >
                        <p><strong>Protocol Version:</strong> {currentExam.ExaminationVersion.Major}.{currentExam.ExaminationVersion.Minor}.{currentExam.ExaminationVersion.Patch}</p>
                        <p><strong>Subject:</strong> {currentExam.ExaminationMetadata.Subject || 'Not specified'}</p>
                        <p><strong>Description:</strong> {currentExam.ExaminationMetadata.Description || 'No description'}</p>
                        <p><strong>Total Score:</strong> {currentExam.ExaminationMetadata.TotalScore}</p>
                        <p><strong>Number of Sections:</strong> {currentExam.ExaminationSections.length}</p>

                        <div style={{ marginTop: 16 }}>
                            <Space>
                                {examInProgress ? (
                                    <Button type="primary" onClick={handleContinueExam}>
                                        Continue Exam
                                    </Button>
                                ) : (
                                    <Button type="primary" onClick={handleStartExam}>
                                        Start Exam
                                    </Button>
                                )}

                                {!examInProgress && (
                                    <Button onClick={handleViewResults}>
                                        View Results
                                    </Button>
                                )}
                            </Space>
                        </div>
                    </Card>
                )}
            </Card>
        </div>
    );
};
export default HomePage;
