import React, { useState, useCallback, FC, lazy, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import SideBar from 'components/Sidebar/Sidebar';
import Navbar from 'components/Navbar/Navbar';
import _ from 'lodash';
import { AlertContextProvider } from 'contexts/AlertContextProvider';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AlertComponent from 'components/@extended/CustomAlert';
import AppRouter from 'router';
import styles from 'App.module.css';
import { queryClient } from 'queryClient';
import Locales from 'components/Locales';
import { fetchSystemSettings, getBaseURL } from 'services/configData';
import Loadable from 'pages/auth/components/Loadable';
const Login = Loadable(lazy(() => import('pages/auth/Login')));

const useSidebarToggle = () => {

    const sidebarExpandValue = localStorage.getItem('sidebarExpand')
    const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(
        _.isEqual(localStorage.getItem('sidebarExpand'), "true")
    );

    const toggleSidebar = useCallback(() => {
        setSidebarExpanded((prevState) => {
            const newState = !prevState;

            localStorage.setItem('sidebarExpand', JSON.stringify(newState));

            return newState;
        });
    }, []);

    return { isSidebarExpanded, toggleSidebar };
};

const App: FC = () => {
    const { isSidebarExpanded, toggleSidebar } = useSidebarToggle();

    useEffect(() => {
        fetchSystemSettings();
    }, []);


      
    return (
        <QueryClientProvider client={queryClient}>
            <Locales>
                <BrowserRouter basename={getBaseURL()}>
                    <Routes>
                        <Route path='/login' element={<Login />} />
                    </Routes>
                    <Navbar />
                    <div
                        className={`${styles.appContainer} ${isSidebarExpanded ? styles.expanded : styles.collapsed}`}
                    >
                        <SideBar onExpandToggle={toggleSidebar} expand={isSidebarExpanded} />
                        <AlertContextProvider>
                            <AlertComponent />
                            <main className={styles.mainContainer}>
                                <AppRouter />
                            </main>
                        </AlertContextProvider>
                    </div>
                </BrowserRouter>
                <ReactQueryDevtools initialIsOpen={false} />
            </Locales>
        </QueryClientProvider>
    );
};

export default App;

