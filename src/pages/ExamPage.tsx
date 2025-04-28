import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, message, Modal, Space, Spin, Progress, Radio, Checkbox, Input, Form } from 'antd';
import { LeftOutlined, RightOutlined, CheckOutlined } from '@ant-design/icons';
import { useExamStore } from '../stores/examStore';
import { useConfigStore } from '../stores/configStore';
import { Question, QuestionTypes } from '../models/types';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const ExamPage = () => {
    const navigate = useNavigate();
    const { currentExam, examInProgress, updateUserAnswer, endExam } = useExamStore();
    useConfigStore();

    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    // Redirect if no exam or not in progress
    useEffect(() => {
        if (!currentExam || !examInProgress) {
            navigate('/');
        }
    }, [currentExam, examInProgress, navigate]);

    if (!currentExam) {
        return <Spin size="large" />;
    }

    const currentSection = currentExam.ExaminationSections[currentSectionIndex];
    const currentQuestion = currentSection?.Questions?.[currentQuestionIndex];

    // Total questions in the exam
    const totalQuestions = currentExam.ExaminationSections.reduce(
        (acc, section) => acc + (section.Questions?.length || 0),
        0
    );

    // Calculate current question number across all sections
    const currentQuestionNumber = currentExam.ExaminationSections.slice(0, currentSectionIndex).reduce(
        (acc, section) => acc + (section.Questions?.length || 0),
        0
    ) + currentQuestionIndex + 1;

    // Progress percentage
    const progressPercentage = Math.floor((currentQuestionNumber / totalQuestions) * 100);

    const handlePrevious = () => {
        // If we're at the first question of the section
        if (currentQuestionIndex === 0) {
            // If we're at the first section, do nothing
            if (currentSectionIndex === 0) {
                return;
            }

            // Otherwise, go to the last question of the previous section
            const prevSection = currentExam.ExaminationSections[currentSectionIndex - 1];
            setCurrentSectionIndex(currentSectionIndex - 1);
            setCurrentQuestionIndex((prevSection.Questions?.length || 1) - 1);
        } else {
            // Simply go to the previous question
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleNext = () => {
        // If we're at the last question of the section
        if (currentQuestionIndex === (currentSection.Questions?.length || 0) - 1) {
            // If we're at the last section, do nothing
            if (currentSectionIndex === currentExam.ExaminationSections.length - 1) {
                return;
            }

            // Otherwise, go to the first question of the next section
            setCurrentSectionIndex(currentSectionIndex + 1);
            setCurrentQuestionIndex(0);
        } else {
            // Simply go to the next question
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleSubmit = () => {
        Modal.confirm({
            title: 'Submit Examination',
            content: 'Are you sure you want to submit this examination? This action cannot be undone.',
            onOk: async () => {
                setSubmitting(true);
                try {
                    // First end the exam (calculating scores for auto-graded questions)
                    endExam();

                    // If there are AI-graded questions, show a modal that they'll be graded
                    const hasAiGradedQuestions = currentExam.ExaminationSections.some(
                        section => section.Questions?.some(q => q.IsAiJudge) || false
                    );

                    if (hasAiGradedQuestions) {
                        Modal.info({
                            title: 'AI Grading Required',
                            content: 'Some questions require AI grading. Please navigate to the Results page to initiate AI grading.',
                        });
                    }

                    // Navigate to results page
                    navigate('/results');
                } catch (error) {
                    console.error('Error submitting exam:', error);
                    message.error('There was a problem submitting your exam');
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    // Save the current answer
    const saveAnswer = (answer: string[]) => {
        updateUserAnswer(currentSectionIndex, currentQuestionIndex, answer);
    };

    // Handle form submission for current question
    const handleQuestionSubmit = (values: any) => {
        const { answer } = values;

        // Format answer based on question type
        let formattedAnswer: string[];

        switch (currentQuestion?.Type) {
            case QuestionTypes.SingleChoice:
            case QuestionTypes.Judgment:
                formattedAnswer = [answer];
                break;

            case QuestionTypes.MultipleChoice:
                formattedAnswer = answer || [];
                break;

            case QuestionTypes.FillInTheBlank:
            case QuestionTypes.Math:
            case QuestionTypes.Essay:
            case QuestionTypes.ShortAnswer:
            case QuestionTypes.Calculation:
            default:
                formattedAnswer = Array.isArray(answer) ? answer : [answer];
                break;
        }

        // Save the answer
        saveAnswer(formattedAnswer);

        // Go to the next question automatically
        handleNext();
    };

    // Reset form when question changes
    useEffect(() => {
        if (currentQuestion) {
            // Set form values based on saved answers
            const userAnswer = currentQuestion.UserAnswer || [];

            switch (currentQuestion.Type) {
                case QuestionTypes.SingleChoice:
                case QuestionTypes.Judgment:
                    form.setFieldsValue({ answer: userAnswer[0] });
                    break;

                case QuestionTypes.MultipleChoice:
                    form.setFieldsValue({ answer: userAnswer });
                    break;

                default:
                    form.setFieldsValue({ answer: userAnswer.join('\n') });
                    break;
            }
        }
    }, [currentQuestion, form]);

    if (!currentQuestion) {
        return (
            <Card>
                <Title level={3}>No Questions Found</Title>
                <Paragraph>
                    This section does not contain any questions.
                </Paragraph>
                <Button type="primary" onClick={() => navigate('/')}>
                    Return to Home
                </Button>
            </Card>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Progress percent={progressPercentage} status="active" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text>Section: {currentSection.Title}</Text>
                        <Text>Question {currentQuestionNumber} of {totalQuestions}</Text>
                    </div>
                </div>

                <Card
                    title={`Question ${currentQuestionNumber} (${currentQuestion.Score} points)`}
                    style={{ marginBottom: 16 }}
                >
                    <Paragraph>
                        <div dangerouslySetInnerHTML={{ __html: currentQuestion.Stem.replace(/\n/g, '<br/>') }} />
                    </Paragraph>

                    {/* Render reference materials if available */}
                    {currentQuestion.ReferenceMaterials && currentQuestion.ReferenceMaterials.length > 0 && (
                        <Card type="inner" title="Reference Materials" style={{ marginBottom: 16 }}>
                            {currentQuestion.ReferenceMaterials.map((material, materialIndex) => (
                                <div key={materialIndex}>
                                    {material.Materials.map((text, textIndex) => (
                                        <Paragraph key={textIndex}>
                                            <div dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }} />
                                        </Paragraph>
                                    ))}

                                    {material.Images && material.Images.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {material.Images.map((image, imageIndex) => (
                                                <div key={imageIndex} style={{ border: '1px solid #eee', padding: 8 }}>
                                                    {image.Type === 2 && image.Uri && (
                                                        <img src={image.Uri} alt={`Reference ${imageIndex}`} style={{ maxWidth: '100%', maxHeight: 300 }} />
                                                    )}
                                                    {image.Type === 3 && image.Image && (
                                                        <img
                                                            src={`data:image/jpeg;base64,${image.Image}`}
                                                            alt={`Reference ${imageIndex}`}
                                                            style={{ maxWidth: '100%', maxHeight: 300 }}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </Card>
                    )}

                    <Form
                        form={form}
                        name="questionForm"
                        onFinish={handleQuestionSubmit}
                        layout="vertical"
                    >
                        {/* Render question based on type */}
                        {renderQuestionInput(currentQuestion)}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                            <Button
                                onClick={handlePrevious}
                                disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                                icon={<LeftOutlined />}
                            >
                                Previous
                            </Button>

                            <Space>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                >
                                    Save & Next
                                </Button>

                                {currentSectionIndex === currentExam.ExaminationSections.length - 1 &&
                                    currentQuestionIndex === (currentSection.Questions?.length || 0) - 1 && (
                                        <Button
                                            type="primary"
                                            onClick={handleSubmit}
                                            loading={submitting}
                                            icon={<CheckOutlined />}
                                        >
                                            Submit Exam
                                        </Button>
                                    )}
                            </Space>

                            <Button
                                onClick={handleNext}
                                disabled={
                                    currentSectionIndex === currentExam.ExaminationSections.length - 1 &&
                                    currentQuestionIndex === (currentSection.Questions?.length || 0) - 1
                                }
                                icon={<RightOutlined />}
                            >
                                Next
                            </Button>
                        </div>
                    </Form>
                </Card>
            </Card>
        </div>
    );

    // Helper function to render input based on question type
    function renderQuestionInput(question: Question) {
        switch (question.Type) {
            case QuestionTypes.SingleChoice:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please select an answer' }]}>
                        <Radio.Group>
                            {question.Options?.map(([key, value]) => (
                                <div key={key} style={{ margin: '8px 0' }}>
                                    <Radio value={key}>
                                        <Space>
                                            <Text strong>{key}.</Text>
                                            <Text>{value}</Text>
                                        </Space>
                                    </Radio>
                                </div>
                            ))}
                        </Radio.Group>
                    </Form.Item>
                );

            case QuestionTypes.MultipleChoice:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please select at least one answer' }]}>
                        <Checkbox.Group style={{ width: '100%' }}>
                            {question.Options?.map(([key, value]) => (
                                <div key={key} style={{ margin: '8px 0' }}>
                                    <Checkbox value={key}>
                                        <Space>
                                            <Text strong>{key}.</Text>
                                            <Text>{value}</Text>
                                        </Space>
                                    </Checkbox>
                                </div>
                            ))}
                        </Checkbox.Group>
                    </Form.Item>
                );

            case QuestionTypes.Judgment:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please select an answer' }]}>
                        <Radio.Group>
                            <Radio value="True">True</Radio>
                            <Radio value="False">False</Radio>
                        </Radio.Group>
                    </Form.Item>
                );

            case QuestionTypes.FillInTheBlank:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please enter your answer' }]}>
                        <Input placeholder="Enter your answer" />
                    </Form.Item>
                );

            case QuestionTypes.Essay:
            case QuestionTypes.ShortAnswer:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please enter your answer' }]}>
                        <TextArea rows={10} placeholder="Enter your answer" />
                    </Form.Item>
                );

            case QuestionTypes.Math:
            case QuestionTypes.Calculation:
            case QuestionTypes.Complex:
            case QuestionTypes.Other:
            default:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please enter your answer' }]}>
                        <TextArea rows={6} placeholder="Enter your answer" />
                    </Form.Item>
                );
        }
    }
};

export default ExamPage;
