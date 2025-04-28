import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, SettingOutlined, FileOutlined, TrophyOutlined } from '@ant-design/icons';
import { useExamStore } from '../stores/examStore';

const { Header } = Layout;

const AppHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentExam, examInProgress } = useExamStore();

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
    ];

    if (currentExam && examInProgress) {
        items.push({
            key: '/exam',
            icon: <FileOutlined />,
            label: 'Current Exam',
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
                Exam System
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
