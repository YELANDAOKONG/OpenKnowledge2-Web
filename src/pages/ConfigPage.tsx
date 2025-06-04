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
                <Title level={2}>系统设置</Title>
                <Paragraph>
                    请配置您的OpenAI API设置以启用 AI 驱动的考试评分辅助等智能功能。
                    此信息将仅存储在您的浏览器本地。
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
                        label="OpenAI API 地址"
                        rules={[{ required: true, message: 'Please enter the OpenAI API URL' }]}
                    >
                        <Input placeholder="https://api.openai.com/v1" />
                    </Form.Item>

                    <Form.Item
                        name="OpenAiApiKey"
                        label="OpenAI API 密钥"
                        rules={[{ required: true, message: 'Please enter your OpenAI API key' }]}
                    >
                        <Input.Password placeholder="sk-..." />
                    </Form.Item>

                    <Form.Item
                        name="OpenAiModel"
                        label="OpenAI 模型名称"
                        rules={[{ required: true, message: 'Please enter the model name' }]}
                    >
                        <Input placeholder="gpt-3.5-turbo" />
                    </Form.Item>

                    <Form.Item
                        name="OpenAiModelTemperature"
                        label="模型温度"
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
                            保存设置
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ConfigPage;
