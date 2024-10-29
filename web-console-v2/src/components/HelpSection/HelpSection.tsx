import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import KeyboardDoubleArrowRightOutlinedIcon from '@mui/icons-material/KeyboardDoubleArrowRightOutlined';
import { theme } from 'theme';
import styles from './HelpSection.module.css';

interface HelpSectionProps {
    title?: string | "Setup Guide";
    contents?: string | "";
    defaultHighlight: string;
}

interface Props {
    helpSection: HelpSectionProps;
    helpText?: JSX.Element;
    onExpandToggle?: () => void;
    highlightSection: string | null;
    expand: boolean;
}
let highlightedSection = "";
const HelpSection: React.FC<Props> = ({ helpSection, helpText, highlightSection, onExpandToggle, expand }) => {
    
    const generateDynamicStyles = (): Record<string, any> => {
        if(highlightSection === highlightedSection) {
            return {};
        }
        highlightedSection = highlightSection || helpSection.defaultHighlight;
        const styles: Record<string, any> = {};
        if(helpText) {
            const sections = document.getElementsByTagName('section');
            Array.from(sections).forEach(section => {
                section.classList.remove("highlighted");
            });
            setTimeout(() => {  
                document.getElementById(highlightedSection)?.classList.add("highlighted");

                document.getElementById(highlightedSection)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        } else {
            const contentSections = helpSection.contents?.match(/id="([^"]+)"|section\d+/g) || [];
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
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            '::after': {
                                                content: '""',
                                                display: 'block',
                                                width: '50%',
                                                borderBottom:`2px solid ${theme.palette.primary.main}`,
                                                position: 'absolute',
                                                bottom: 0,
                                                left: '25%'
                                            }
                                        }}
                                    >
                                        <Box className={styles.menusNames}>
                                            <Typography
                                                variant={'h2'}
                                                sx={{
                                                    color: 'primary.main'
                                                }}
                                            >
                                                {helpSection.title || "Setup Guide"}
                                            </Typography>
                                        </Box>
                                    </Box>
                            </Box>
                        </Box>
                        <Box className={styles.contentContainer}>
                            {helpText ? (
                                helpText
                            ) : (
                                <Box
                                    component="div"
                                    sx={dynamicStyles}
                                    dangerouslySetInnerHTML={{
                                        __html: helpSection.contents || ""
                                    }}
                                />
                            )}
                        </Box>
                    </>
                )}
            </div>
        </div>
    );
};

export default HelpSection;