import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, message, Space, Spin, Progress, Radio, Checkbox, Input, Form, Alert, Divider } from 'antd';
import { LeftOutlined, RightOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons';
import { useExamStore } from '../stores/examStore';
import { useConfigStore } from '../stores/configStore';
import { Question, QuestionTypes } from '../models/types';
import { openAIService } from '../services/openaiService';
import { App as AntApp } from 'antd';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const StudyPage = () => {
    const navigate = useNavigate();
    const { currentExam, examInProgress, updateUserAnswer, endExam } = useExamStore();
    const { config } = useConfigStore();
    const { modal } = AntApp.useApp();

    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    // Study mode specific states
    const [questionSubmitted, setQuestionSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);

    // Add a flag to track form submission to prevent state reset
    const isSubmittingRef = useRef(false);

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
        if (aiProcessing) return;

        setQuestionSubmitted(false);
        setIsCorrect(null);
        setAiFeedback(null);

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
        if (aiProcessing) return;

        setQuestionSubmitted(false);
        setIsCorrect(null);
        setAiFeedback(null);

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
        modal.confirm({
            title: 'End Study Session',
            content: 'Are you sure you want to end this study session? Your progress will be saved.',
            onOk: async () => {
                try {
                    setSubmitting(true);
                    endExam();
                    navigate('/results');
                } catch (error) {
                    console.error("Error ending study session:", error);
                    message.error('There was a problem ending your study session');
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    // Save the current answer and check if it's correct
    const saveAnswer = (answer: string[]) => {
        updateUserAnswer(currentSectionIndex, currentQuestionIndex, answer);
    };

    const onFormFinishFailed = (errorInfo: any) => {
        console.error('Form validation failed:', errorInfo);
        message.error('Please provide an answer before submitting');
    };

    // Handle form submission for current question
    const handleQuestionSubmit = (values: any) => {
        try {
            // Set the ref to true to prevent useEffect from resetting our state
            isSubmittingRef.current = true;

            console.log("Form submission triggered with values:", values);
            const { answer } = values;

            // Handle case when answer is undefined or null
            if (answer === undefined || answer === null) {
                message.error('Please provide an answer before submitting');
                return;
            }

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
                    // Handle text responses properly
                    formattedAnswer = typeof answer === 'string'
                        ? [answer]
                        : Array.isArray(answer) ? answer : [answer?.toString() || ''];
                    break;
            }

            console.log("Formatted answer:", formattedAnswer);

            // Save the answer
            saveAnswer(formattedAnswer);

            // Check if answer is correct (for non-AI-judged questions)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (!currentQuestion.IsAiJudge) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const correct = isAnswerCorrect(currentQuestion, formattedAnswer);
                setIsCorrect(correct);
                console.log("Answer correctness:", correct);
            } else {
                setIsCorrect(null); // Need AI judgment
                console.log("Answer requires AI judgment");
            }

            // Set state and force re-render
            setQuestionSubmitted(true);
            console.log("Question submitted successfully, questionSubmitted set to true");

            // Add a message to confirm submission
            message.success('Answer submitted successfully');

        } catch (error) {
            console.error("Error during form submission:", error);
            message.error('An error occurred while submitting your answer');
        } finally {
            // Set a timeout to reset the ref
            setTimeout(() => {
                isSubmittingRef.current = false;
            }, 500);
        }
    };

    // Replace your existing AI feature handlers with these:
    const handleSmartCheck = async () => {
        if (!currentQuestion || !config.OpenAiApiKey) {
            message.error('AI service not configured or no question selected');
            return;
        }

        try {
            setAiProcessing(true);
            setAiFeedback(null);

            if (!openAIService.isInitialized()) {
                openAIService.initialize(config);
            }

            const result = await openAIService.gradeQuestion(currentQuestion, config);

            setAiFeedback(`AI Evaluation: ${result.feedback}`);
            setIsCorrect(result.isCorrect);

        } catch (error) {
            console.error('Error during AI evaluation:', error);
            message.error('Failed to get AI evaluation');
        } finally {
            setAiProcessing(false);
        }
    };

    const handleSmartExplain = async () => {
        if (!currentQuestion || !config.OpenAiApiKey) {
            message.error('AI service not configured or no question selected');
            return;
        }

        try {
            setAiProcessing(true);
            setAiFeedback(null);

            if (!openAIService.isInitialized()) {
                openAIService.initialize(config);
            }

            // Use the new method from OpenAIService
            const explanation = await openAIService.explainQuestion(currentQuestion, config);
            setAiFeedback(`Question Explanation: ${explanation}`);

        } catch (error) {
            console.error('Error getting question explanation:', error);
            message.error('Failed to get question explanation');
        } finally {
            setAiProcessing(false);
        }
    };

    const handleQuestionVerify = async () => {
        if (!currentQuestion || !config.OpenAiApiKey) {
            message.error('AI service not configured or no question selected');
            return;
        }

        try {
            setAiProcessing(true);
            setAiFeedback(null);

            if (!openAIService.isInitialized()) {
                openAIService.initialize(config);
            }

            // Use the new method from OpenAIService
            const verification = await openAIService.verifyQuestion(currentQuestion, config);
            setAiFeedback(`Question Verification: ${verification}`);

        } catch (error) {
            console.error('Error verifying question:', error);
            message.error('Failed to verify question');
        } finally {
            setAiProcessing(false);
        }
    };


    // Reset form when question changes - MODIFIED to prevent resetting during submission
    useEffect(() => {
        if (currentQuestion && !isSubmittingRef.current) {
            console.log("Question changed, resetting form");
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

            // Reset states
            setQuestionSubmitted(false);
            setIsCorrect(null);
            setAiFeedback(null);
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

    // Helper function to check if an answer is correct
    function isAnswerCorrect(question: Question, userAnswer: string[]): boolean {
        if (!userAnswer || userAnswer.length === 0 || !question.Answer || question.Answer.length === 0) {
            return false;
        }

        switch (question.Type) {
            case QuestionTypes.SingleChoice:
                return userAnswer[0]?.trim().toLowerCase() === question.Answer[0]?.trim().toLowerCase();

            case QuestionTypes.MultipleChoice:
                // All selected options must match exactly
                if (userAnswer.length !== question.Answer.length) {
                    return false;
                }

                const userOptions = new Set(userAnswer.map(a => a?.trim().toLowerCase() || ''));
                const correctOptions = new Set(question.Answer.map(a => a?.trim().toLowerCase() || ''));

                // Check if sets are equal
                return [...userOptions].every(opt => correctOptions.has(opt)) &&
                    [...correctOptions].every(opt => userOptions.has(opt));

            case QuestionTypes.Judgment:
                return userAnswer[0]?.trim().toLowerCase() === question.Answer[0]?.trim().toLowerCase();

            case QuestionTypes.FillInTheBlank:
                return userAnswer[0]?.trim().toLowerCase() === question.Answer[0]?.trim().toLowerCase();

            default:
                return false; // Complex types require AI judgment
        }
    }

    // Log current state for debugging
    console.log("Current state:", {
        questionSubmitted,
        isCorrect,
        isSubmittingRef: isSubmittingRef.current
    });

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

                    {/* AI Feedback Area - CSS-based approach */}
                    {aiFeedback && (
                        <Alert
                            message="AI Feedback"
                            description={
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'inherit',
                                    margin: 0
                                }}>
                                    {aiFeedback}
                                </pre>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}


                    {/* Result Area - Only shown after submission */}
                    {questionSubmitted && (
                        <div id="result-area" style={{ marginBottom: 16 }}>
                            <Alert
                                message={isCorrect === true ? "Correct!" : isCorrect === false ? "Incorrect" : "Answer Submitted"}
                                description={
                                    isCorrect === null ? (
                                        "This question requires AI judgment. Use the Smart Check feature to evaluate your answer."
                                    ) : null
                                }
                                type={isCorrect === true ? "success" : isCorrect === false ? "error" : "info"}
                                showIcon
                                style={{ marginBottom: 16 }}
                            />

                            <Card type="inner" title="Reference Answer" style={{ marginBottom: 16 }}>
                                <Paragraph>
                                    {currentQuestion.Answer.join(', ')}
                                </Paragraph>
                                {currentQuestion.ReferenceAnswer && (
                                    <Paragraph>
                                        <div dangerouslySetInnerHTML={{
                                            __html: currentQuestion.ReferenceAnswer.join('<br/>').replace(/\n/g, '<br/>')
                                        }} />
                                    </Paragraph>
                                )}
                            </Card>
                        </div>
                    )}

                    <Form
                        form={form}
                        name="questionForm"
                        onFinish={handleQuestionSubmit}
                        onFinishFailed={onFormFinishFailed}
                        layout="vertical"
                        disabled={questionSubmitted}
                    >
                        {/* Render question based on type */}
                        {renderQuestionInput(currentQuestion)}

                        <div style={{ marginTop: 16 }}>
                            {questionSubmitted ? (
                                <Space wrap>
                                    <Button
                                        type="primary"
                                        icon={<RobotOutlined />}
                                        onClick={handleSmartCheck}
                                        loading={aiProcessing && aiFeedback === null}
                                        disabled={aiProcessing}
                                    >
                                        Smart Check
                                    </Button>
                                    <Button
                                        icon={<RobotOutlined />}
                                        onClick={handleSmartExplain}
                                        loading={aiProcessing && aiFeedback === null}
                                        disabled={aiProcessing}
                                    >
                                        Smart Q&A
                                    </Button>
                                    <Button
                                        icon={<RobotOutlined />}
                                        onClick={handleQuestionVerify}
                                        loading={aiProcessing && aiFeedback === null}
                                        disabled={aiProcessing}
                                    >
                                        Question Verification
                                    </Button>
                                </Space>
                            ) : (
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    onClick={() => console.log("Submit button clicked, current form values:", form.getFieldsValue())}
                                >
                                    Submit Answer
                                </Button>
                            )}
                        </div>

                        <Divider />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Button
                                onClick={handlePrevious}
                                disabled={aiProcessing || (currentSectionIndex === 0 && currentQuestionIndex === 0)}
                                icon={<LeftOutlined />}
                            >
                                Previous
                            </Button>

                            <Button
                                type="primary"
                                onClick={handleSubmit}
                                loading={submitting}
                                icon={<CheckOutlined />}
                            >
                                End Study Session
                            </Button>

                            <Button
                                onClick={handleNext}
                                disabled={aiProcessing || (
                                    currentSectionIndex === currentExam.ExaminationSections.length - 1 &&
                                    currentQuestionIndex === (currentSection.Questions?.length || 0) - 1
                                )}
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
        // Helper function to get option key and value
        const getOptionKeyValue = (option: any): {key: string, value: string} => {
            if (option.Id !== undefined && option.Text !== undefined) {
                // New format
                return {key: option.Id, value: option.Text};
            } else if (option.Item1 !== undefined && option.Item2 !== undefined) {
                // Old format
                return {key: option.Item1, value: option.Item2};
            }
            // Fallback
            return {key: '', value: ''};
        };
        const options = Array.isArray(question.Options) ? question.Options : [];
        switch (question.Type) {
            case QuestionTypes.SingleChoice:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please select an answer' }]}>
                        <Radio.Group>
                            {options.map((option, index) => {
                                const {key, value} = getOptionKeyValue(option);
                                return (
                                    <div key={`${key}-${index}`} style={{ margin: '8px 0' }}>
                                        <Radio value={key}>
                                            <Space>
                                                <Text strong>{key}.</Text>
                                                <Text>{value}</Text>
                                            </Space>
                                        </Radio>
                                    </div>
                                );
                            })}
                        </Radio.Group>
                    </Form.Item>
                );
            case QuestionTypes.MultipleChoice:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please select at least one answer' }]}>
                        <Checkbox.Group style={{ width: '100%' }}>
                            {options.map((option, index) => {
                                const {key, value} = getOptionKeyValue(option);
                                return (
                                    <div key={`${key}-${index}`} style={{ margin: '8px 0' }}>
                                        <Checkbox value={key}>
                                            <Space>
                                                <Text strong>{key}.</Text>
                                                <Text>{value}</Text>
                                            </Space>
                                        </Checkbox>
                                    </div>
                                );
                            })}
                        </Checkbox.Group>
                    </Form.Item>
                );
            case QuestionTypes.Judgment:
                return (
                    <Form.Item name="answer" rules={[{ required: true, message: 'Please select an answer' }]}>
                        <Radio.Group>
                            {/* Use options from question if available */}
                            {Array.isArray(question.Options) && question.Options.map((option, index) => {
                                const {key, value} = getOptionKeyValue(option);
                                return (
                                    <div key={`${key}-${index}`} style={{ margin: '8px 0' }}>
                                        <Radio value={key}>
                                            <Space>
                                                <Text strong>{key}:</Text>
                                                <Text>{value}</Text>
                                            </Space>
                                        </Radio>
                                    </div>
                                );
                            })}
                            {/* Default T/F options if no options provided */}
                            {(!Array.isArray(question.Options) || question.Options.length === 0) && (
                                <>
                                    <Radio value="T">True</Radio>
                                    <Radio value="F">False</Radio>
                                </>
                            )}
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

export default StudyPage;
