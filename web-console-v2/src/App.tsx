import React, { useState, useCallback, FC, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import SideBar from 'components/Sidebar/Sidebar';
import Navbar from 'components/Navbar/Navbar';
import _ from 'lodash';
import { AlertContextProvider } from 'contexts/AlertContextProvider';
import { BrowserRouter } from 'react-router-dom';
import AlertComponent from 'components/@extended/CustomAlert';
import AppRouter from 'router';
import styles from 'App.module.css';
import { queryClient } from 'queryClient';
import Locales from 'components/Locales';
import { fetchSystemSettings, getBaseURL } from 'services/configData';
import Loader from 'components/Loader';

const useSidebarToggle = () => {

    const sidebarExpandValue = localStorage.getItem('sidebarExpand')
    const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(
        _.isEqual(sidebarExpandValue, "true")
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
    const isLoginRoute = window.location.pathname.includes("/login");
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        fetchSystemSettings().finally(() => {
            setIsLoading(false)
        })
    }, []);

    return (
        (isLoading ? <Loader loading={true} /> 
        : <QueryClientProvider client={queryClient}>
            <Locales>
                <BrowserRouter basename={getBaseURL()}>
                    <Navbar />
                    <div className={`${styles.appContainer} ${isSidebarExpanded ? styles.expanded : styles.collapsed}`}>
                        {!isLoginRoute && (<SideBar onExpandToggle={toggleSidebar} expand={isSidebarExpanded} />)}
                        <AlertContextProvider>
                            <AlertComponent />
                            <main className={isLoginRoute ? styles.mainLoginContainer : styles.mainContainer}>
                                <AppRouter />
                            </main>
                        </AlertContextProvider>
                    </div>
                </BrowserRouter>
                <ReactQueryDevtools initialIsOpen={false} />
            </Locales>
        </QueryClientProvider> )
    );
};

export default App;

