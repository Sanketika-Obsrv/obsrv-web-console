import React, { useState, useCallback, FC } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import _ from 'lodash';
import { BrowserRouter } from 'react-router-dom';
import { AlertContextProvider } from 'contexts/AlertContextProvider';
import SideBar from 'components/Sidebar/Sidebar';
import Navbar from 'components/Navbar/Navbar';
import AlertComponent from 'components/@extended/CustomAlert';
import AppRouter from 'router';
import styles from 'App.module.css';
import { queryClient } from 'queryClient';

const useSidebarToggle = () => {
    const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(
        _.isEqual(localStorage.getItem('sidebarExpand'), true)
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

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
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
        </QueryClientProvider>
    );
};

export default App;
