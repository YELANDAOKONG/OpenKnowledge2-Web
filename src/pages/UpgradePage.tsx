import { useState } from 'react';
import { Card, Typography, Upload, Button, message, Alert, Divider, List } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { UploadFile } from 'antd/es/upload/interface';
import { RcFile } from 'antd/es/upload';
import { Examination, CURRENT_PROTOCOL_VERSION } from '../models/types';

const { Title, Paragraph, Text } = Typography;

const UpgradePage = () => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [convertedExam, setConvertedExam] = useState<Examination | null>(null);
    const [upgradeLog, setUpgradeLog] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleUpgrade = async () => {
        const file = fileList[0] as RcFile;
        if (!file) {
            message.error('Please select an exam file to upload');
            return;
        }

        setUploading(true);
        setUpgradeLog([]);
        setErrorMessage(null);

        try {
            const text = await file.text();
            const examData = JSON.parse(text) as Examination;

            // Validate basic examination structure
            if (!examData.ExaminationMetadata || !examData.ExaminationSections) {
                throw new Error('Invalid examination format');
            }

            const logs: string[] = [];
            logs.push(`Starting upgrade from v${examData.ExaminationVersion?.Major || '1'}.${examData.ExaminationVersion?.Minor || '0'}.${examData.ExaminationVersion?.Patch || '0'} to v${CURRENT_PROTOCOL_VERSION.Major}.${CURRENT_PROTOCOL_VERSION.Minor}.${CURRENT_PROTOCOL_VERSION.Patch}`);

            // Create a deep copy to work with
            const upgradedExam = JSON.parse(JSON.stringify(examData)) as Examination;

            // Update version
            upgradedExam.ExaminationVersion = { ...CURRENT_PROTOCOL_VERSION };
            logs.push('Updated protocol version');

            // Process all questions to update option format
            let totalQuestions = 0;
            let updatedQuestions = 0;

            // Helper function to process questions recursively
            const processQuestions = (questions: any[] | null | undefined) => {
                if (!questions) return;

                for (const question of questions) {
                    totalQuestions++;

                    // Process options if they exist
                    if (Array.isArray(question.Options) && question.Options.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        const hasOldFormat = question.Options.some(opt =>
                            opt.Item1 !== undefined && opt.Item2 !== undefined);

                        if (hasOldFormat) {
                            // Convert from old to new format
                            question.Options = question.Options.map((opt: any) => ({
                                Id: opt.Item1 || '',
                                Text: opt.Item2 || ''
                            }));

                            updatedQuestions++;
                        }
                    }

                    // Process sub-questions recursively if they exist
                    if (Array.isArray(question.SubQuestions)) {
                        processQuestions(question.SubQuestions);
                    }
                }
            };

            // Process all sections
            for (const section of upgradedExam.ExaminationSections) {
                processQuestions(section.Questions);
            }

            logs.push(`Processed ${totalQuestions} questions, updated ${updatedQuestions} question options`);
            logs.push('Upgrade completed successfully');

            setConvertedExam(upgradedExam);
            setUpgradeLog(logs);

        } catch (error) {
            console.error('Failed to upgrade exam:', error);
            setErrorMessage(`Failed to upgrade exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = () => {
        if (!convertedExam) return;

        const content = JSON.stringify(convertedExam, null, 2);
        const fileName = `upgraded_${fileList[0]?.name || 'exam'}.json`;

        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        message.success('Upgraded exam file downloaded successfully');
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Card>
                <Title level={2}>协议迁移工具</Title>
                <Paragraph>
                    此工具可将旧版协议（如1.0.0）的考试文件升级至当前版本 {CURRENT_PROTOCOL_VERSION.Major}.{CURRENT_PROTOCOL_VERSION.Minor}.{CURRENT_PROTOCOL_VERSION.Patch}。
                    <br/>
                    当前协议之间的主要差异在于题目中选项的存储方式，从 Item1 / Item2 格式转变为 Id / Text 格式。
                </Paragraph>

                <Alert
                    message="重要提示"
                    description="该工具不会修改您的原始文件。升级完成后，您将能够下载更新后的版本。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Card title="第一步：选择试卷文件" style={{ marginBottom: 16 }}>
                    <Upload
                        fileList={fileList}
                        beforeUpload={(file) => {
                            setFileList([file]);
                            return false;
                        }}
                        onRemove={() => {
                            setFileList([]);
                            setConvertedExam(null);
                            setUpgradeLog([]);
                            setErrorMessage(null);
                        }}
                        maxCount={1}
                        accept=".json"
                    >
                        <Button icon={<UploadOutlined />}>选择试卷文件 (v1.x.x)</Button>
                    </Upload>
                </Card>

                <Card title="第二步：升级协议版本" style={{ marginBottom: 16 }}>
                    <Button
                        type="primary"
                        onClick={handleUpgrade}
                        disabled={fileList.length === 0}
                        loading={uploading}
                        style={{ marginBottom: 16 }}
                    >
                        迁移到 v{CURRENT_PROTOCOL_VERSION.Major}.{CURRENT_PROTOCOL_VERSION.Minor}.{CURRENT_PROTOCOL_VERSION.Patch}
                    </Button>

                    {upgradeLog.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Divider>迁移日志</Divider>
                            <List
                                bordered
                                dataSource={upgradeLog}
                                renderItem={(log) => <List.Item>{log}</List.Item>}
                            />
                        </div>
                    )}

                    {errorMessage && (
                        <Alert
                            message="Error"
                            description={errorMessage}
                            type="error"
                            showIcon
                            style={{ marginTop: 16 }}
                        />
                    )}
                </Card>

                {convertedExam && (
                    <Card title="第三步：下载升级后的文件">
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleDownload}
                        >
                            下载迁移后的试卷
                        </Button>

                        <div style={{ marginTop: 16 }}>
                            <Text strong>文件已经准备好下载！</Text>
                            <br />
                            <Text>试卷已成功迁移至协议版本 {CURRENT_PROTOCOL_VERSION.Major}.{CURRENT_PROTOCOL_VERSION.Minor}.{CURRENT_PROTOCOL_VERSION.Patch}</Text>
                        </div>
                    </Card>
                )}
            </Card>
        </div>
    );
};

export default UpgradePage;
