import { Box, Fab } from '@mui/material';
import { useState, useEffect } from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import  interactIds  from 'data/telemetry/interact.json';

const ScrollButton = () => {
    const [icon, setIcon] = useState(<ArrowDownOutlined />);
    const [scrollDirection, setScrollDirection] = useState<string>("bottom");
    const toggleScroll = () => {
        if (scrollDirection === "bottom") scrollToBottom();
        else scrollToTop();
    };

    useEffect(() => {
        const onScroll = () => setScrollDirection(() => {
            if (window.scrollY > 100) {
                setIcon(<ArrowUpOutlined />);
                return "top";
            } else {
                setIcon(<ArrowDownOutlined />);
                return "bottom";
            };
        });
        window.removeEventListener("scroll", onScroll);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const scrollToBottom = () => {
        const scrollingElement = (document.scrollingElement || document.body);
        window.scrollTo({
            top: scrollingElement.scrollHeight,
            behavior: "smooth"
        });
    };

    return (<Box sx={{ position: "fixed", bottom: 0, mb: 3, right: 0, mr: 1 }}>
        <Fab
            size="small"
            id="window-scroll" 
            data-edataid={interactIds.button_scroll} 
            data-objecttype="scroll-button" 
            data-objectid={icon.key}
            onClick={() => toggleScroll()}
            sx={{ minWidth: "unset" }}
            color="primary"
        >
            {icon}
        </Fab>
    </Box>);
};

export default ScrollButton;
