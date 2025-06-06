// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { useConfigStore } from './stores/configStore';
import ConfigPage from './pages/ConfigPage';
import HomePage from './pages/HomePage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import UpgradePage from './pages/UpgradePage';
import Layout from './components/Layout';
import StudyPage from "./pages/StudyPage.tsx";

// const getBasename = () => {
//     const scriptElement = document.querySelector('script[src*="/assets/"]');
//     if (scriptElement) {
//         const src = scriptElement.getAttribute('src') || '';
//         const match = src.match(/(.*\/assets\/)/);
//         if (match) return match[1].replace('/assets/', '');
//     }
//     return '/'; // Default
// };

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
                            <Route path="study" element={<StudyPage />} />
                            <Route path="results" element={<ResultsPage />} />
                            <Route path="upgrade" element={<UpgradePage />} />
                        </Route>
                    </Routes>
                </Router>
            </AntApp>
        </ConfigProvider>
    );
}

export default App;
