import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import KeyboardDoubleArrowRightOutlinedIcon from '@mui/icons-material/KeyboardDoubleArrowRightOutlined';
import { theme } from 'theme';
import styles from './HelpSection.module.css';

interface HelpSectionProps {
    isOpen: boolean;
    menus: MenuItems[];
    activeMenuId?: string;
    highlightedSection?: string | null;
}
interface MenuItems {
    id: string;
    title: string;
    index: number;
    contents: string;
}

interface Props {
    helpSection: HelpSectionProps;
    onExpandToggle?: () => void;
    expand: boolean;
}

const HelpSection: React.FC<Props> = ({ helpSection, onExpandToggle, expand }) => {
    const [contentKey, setContentKey] = React.useState(helpSection.activeMenuId || 'getStarted');
    const highlightedSection = helpSection.highlightedSection;

    const handleContentChange = (key: string) => {
        setContentKey(key);
    };

    const generateDynamicStyles = (): Record<string, any> => {
        const styles: Record<string, any> = {};
        const contentMatch = helpSection.menus.find((menu) => menu.id === contentKey);
        const contentSections = contentMatch
            ? contentMatch.contents.match(/id="([^"]+)"|section\d+/g)
            : [];

        if (contentSections) {
            contentSections.forEach((section) => {
                const sectionId =
                    section.match(/section\d+/)?.[0] || section.match(/id="([^"]+)"/)?.[1];

                if (sectionId) {
                    const isHighlighted = highlightedSection === sectionId;

                    styles[`#${sectionId}`] = {
                        color: isHighlighted ? 'orange' : 'inherit',
                        opacity: isHighlighted ? 1 : 0.1
                    };

                    styles[`.displayContent #${sectionId}`] = {
                        opacity: isHighlighted ? 1 : 0.1
                    };

                    if (isHighlighted) {
                        document.getElementById(sectionId)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        }

        return styles;
    };

    const dynamicStyles = generateDynamicStyles();

    return (
        <div>
            <div
                className={`${styles.helpSectionContainer} ${expand ? styles.expanded : styles.collapsed}`}
            >
                <div className={styles.toggleButton} onClick={onExpandToggle}>
                    <div
                        className={`${styles.buttonIcon} ${expand ? styles.expanded : styles.collapsed}`}
                    >
                        <KeyboardDoubleArrowRightOutlinedIcon
                            className={styles.arrowIcon}
                            sx={{ backgroundColor: theme.palette.secondary.main }}
                        />
                    </div>
                </div>
                {expand && (
                    <>
                        <Box className={styles.tabContainer}>
                            <Box className={styles.tabMenus}>
                                {helpSection.menus.map((menu) => (
                                    <Box
                                        key={menu.id}
                                        onClick={() => handleContentChange(menu.id)}
                                        sx={{
                                            position: 'relative',
                                            '::after': {
                                                content: '""',
                                                display: 'block',
                                                width: '50%',
                                                borderBottom:
                                                    contentKey === menu.id
                                                        ? `2px solid ${theme.palette.primary.main}`
                                                        : 'none',
                                                position: 'absolute',
                                                bottom: 0,
                                                left: '25%'
                                            }
                                        }}
                                    >
                                        <Box className={styles.menusNames}>
                                            <Typography
                                                variant={contentKey === menu.id ? 'h2' : 'body1'}
                                                sx={{
                                                    color:
                                                        contentKey === menu.id
                                                            ? 'primary.main'
                                                            : 'text.primary'
                                                }}
                                            >
                                                {menu.title}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box className={styles.contentContainer}>
                            <Box
                                sx={dynamicStyles}
                                dangerouslySetInnerHTML={{
                                    __html:
                                        helpSection.menus.find((menu) => menu.id === contentKey)
                                            ?.contents || ''
                                }}
                            />
                        </Box>
                    </>
                )}
            </div>
        </div>
    );
};

export default HelpSection;
