import { Outlet } from 'react-router-dom';
import { Layout as AntLayout, theme } from 'antd';
import AppHeader from './AppHeader';

const { Content, Footer } = AntLayout;

const Layout = () => {
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <AppHeader />
            <Content style={{ padding: '0 50px', marginTop: 64 }}>
                <div
                    style={{
                        padding: 24,
                        minHeight: 380,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        marginTop: 16,
                    }}
                >
                    <Outlet />
                </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
                Open Knowledge Examination System ©{new Date().getFullYear()}
            </Footer>
        </AntLayout>
    );
};

export default Layout;
