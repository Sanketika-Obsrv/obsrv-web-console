import React, { useState } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import styles from './ConnectorCard.module.css';

interface CardAttributes {
    name: string;
    imageUrl: string;
    selected: boolean;
    onClick: () => void;
    isSelected: boolean;
}

const getRandomColor = () => {
    return `#${Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')}`;
};
const ConnectorCard = ({ name, imageUrl, selected, onClick, isSelected }: CardAttributes) => {
    const [imageError, setImageError] = useState(false);

    const avatarColor = React.useMemo(() => getRandomColor(), []);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('');
    };

    return (
        <Box
            className={`${styles.card} ${selected ? styles.selectedCard : ''}`}
            onClick={onClick}
            sx={{ cursor: 'pointer' }}
            data-testid={selected ? 'selected-card' : 'card'}
        >
            <Box
                className={` ${isSelected ? styles.selectedImageBorder : ''}`}
                data-testid="image-border"
            >
                {imageError || !imageUrl ? (
                    <Avatar
                        className={`${styles.cardAvatar} ${!isSelected ? styles.selectedAvatar : styles.cardAvatar}`}
                        style={{ backgroundColor: avatarColor }}
                    >
                        {getInitials(name)}
                    </Avatar>
                ) : (
                    <img
                        src={imageUrl}
                        alt={name}
                        className={`${styles.cardImage} ${isSelected ? styles.selectedCardImage : ''}`}
                        onError={() => setImageError(true)}
                    />
                )}
            </Box>
            <Typography variant="h2Secondary" className={styles.cardName}>
                {name}
            </Typography>
        </Box>
    );
};

export default ConnectorCard;
