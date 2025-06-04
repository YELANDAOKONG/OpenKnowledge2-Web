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
            label: 'Home',
        },
        {
            key: '/config',
            icon: <SettingOutlined />,
            label: 'Settings',
        },
        {
            key: '/upgrade',
            icon: <ToolOutlined />,
            label: 'Upgrade Tool',
        }
    ];


    if (currentExam && examInProgress) {
        items.push({
            key: studyMode ? '/study' : '/exam',
            icon: studyMode ? <BookOutlined /> : <FileOutlined />,
            label: studyMode ? 'Study Mode' : 'Current Exam',
        });
    }


    if (currentExam && !examInProgress) {
        items.push({
            key: '/results',
            icon: <TrophyOutlined />,
            label: 'Results',
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
