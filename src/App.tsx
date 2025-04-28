import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { useConfigStore } from './stores/configStore';
import ConfigPage from './pages/ConfigPage';
import HomePage from './pages/HomePage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import Layout from './components/Layout';

function App() {
    const { isConfigured } = useConfigStore();

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1677ff',
                },
            }}
        >
            <AntApp>
                <Router>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route
                                index
                                element={isConfigured ? <HomePage /> : <Navigate to="/config" />}
                            />
                            <Route path="config" element={<ConfigPage />} />
                            <Route path="exam" element={<ExamPage />} />
                            <Route path="results" element={<ResultsPage />} />
                        </Route>
                    </Routes>
                </Router>
            </AntApp>
        </ConfigProvider>
    );
}

export default App;
