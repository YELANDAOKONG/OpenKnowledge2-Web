import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, InputNumber, Card, Typography, message } from 'antd';
import { useConfigStore } from '../stores/configStore';
import { SystemConfig } from '../models/types';
import { openAIService } from '../services/openaiService';

const { Title, Paragraph } = Typography;

const ConfigPage = () => {
    const navigate = useNavigate();
    const { config, updateConfig } = useConfigStore();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: SystemConfig) => {
        setLoading(true);
        try {
            // Test connection to OpenAI
            openAIService.initialize(values);

            // Save configuration
            updateConfig(values);
            message.success('Configuration saved successfully');

            // Navigate to home
            navigate('/');
        } catch (error) {
            console.error('Configuration error:', error);
            message.error('Failed to save configuration: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Card>
                <Title level={2}>System Configuration</Title>
                <Paragraph>
                    Please configure your OpenAI API settings to enable AI-powered exam grading.
                    This information will be stored locally in your browser.
                </Paragraph>

                <Form
                    form={form}
                    name="configForm"
                    layout="vertical"
                    initialValues={config}
                    onFinish={onFinish}
                >
                    <Form.Item
                        name="OpenAiApiUrl"
                        label="OpenAI API URL"
                        rules={[{ required: true, message: 'Please enter the OpenAI API URL' }]}
                    >
                        <Input placeholder="https://api.openai.com/v1" />
                    </Form.Item>

                    <Form.Item
                        name="OpenAiApiKey"
                        label="OpenAI API Key"
                        rules={[{ required: true, message: 'Please enter your OpenAI API key' }]}
                    >
                        <Input.Password placeholder="sk-..." />
                    </Form.Item>

                    <Form.Item
                        name="OpenAiModel"
                        label="OpenAI Model"
                        rules={[{ required: true, message: 'Please enter the model name' }]}
                    >
                        <Input placeholder="gpt-3.5-turbo" />
                    </Form.Item>

                    <Form.Item
                        name="OpenAiModelTemperature"
                        label="Model Temperature"
                        rules={[{ required: true, message: 'Please enter a temperature value' }]}
                    >
                        <InputNumber
                            min={0}
                            max={2}
                            step={0.1}
                            style={{ width: '100%' }}
                            placeholder="0.7"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Save Configuration
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ConfigPage;
