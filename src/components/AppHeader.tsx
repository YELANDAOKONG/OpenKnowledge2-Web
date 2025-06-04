import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
    HomeOutlined,
    SettingOutlined,
    FileOutlined,
    TrophyOutlined,
    ToolOutlined,
    BookOutlined
} from '@ant-design/icons';
import { useExamStore } from '../stores/examStore';

const { Header } = Layout;

const AppHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentExam, examInProgress, studyMode  } = useExamStore();

    const items = [
        {
            key: '/',
            icon: <HomeOutlined />,
            label: '主页',
        },
        {
            key: '/config',
            icon: <SettingOutlined />,
            label: '设置',
        },
        {
            key: '/upgrade',
            icon: <ToolOutlined />,
            label: '升级工具',
        }
    ];


    if (currentExam && examInProgress) {
        items.push({
            key: studyMode ? '/study' : '/exam',
            icon: studyMode ? <BookOutlined /> : <FileOutlined />,
            label: studyMode ? '学习模式' : '当前考试',
        });
    }


    if (currentExam && !examInProgress) {
        items.push({
            key: '/results',
            icon: <TrophyOutlined />,
            label: '结果',
        });
    }

    return (
        <Header style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ color: 'white', marginRight: '20px', fontSize: '18px', fontWeight: 'bold' }}>
                OpenKnowledge
            </div>
            <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={[location.pathname]}
                items={items}
                style={{ flex: 1, minWidth: 0 }}
                onClick={({ key }) => navigate(key)}
            />
        </Header>
    );
};

export default AppHeader;
