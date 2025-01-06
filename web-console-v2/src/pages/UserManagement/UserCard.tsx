import React, { useState, MouseEvent } from 'react';
import { Box, Chip, Grid, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import styles from './UserCard.module.css';
import moment from 'moment';
import { User } from './UserManagement';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';

const formatDate = (dateString: moment.MomentInput) => {
    return moment(dateString).format('MMMM DD, YYYY');
};

const rolesMapping = {
    admin: { label: 'Admin', color: 'success' },
    viewer: { label: 'Viewer', color: 'info' },
    ingestor: { label: 'Ingestor', color: 'primary' },
    dataset_creator: { label: 'Dataset Creator', color: 'secondary' },
    dataset_manager: { label: 'Dataset Manager', color: 'warning' },
    operations_admin: { label: 'Operations Admin', color: 'error' }
} as const;

type RoleKey = keyof typeof rolesMapping;

interface Action {
    label: string;
    icon: React.ElementType;
    type: string;
    disabled?: boolean;
}

interface UserCardProps {
    user: User;
    onMenuAction: (
        event: React.MouseEvent<HTMLElement>,
        userName: string,
        actionType: string,
    ) => void;
    currentUser: User;
}

const UserCard: React.FC<UserCardProps> = ({ user, onMenuAction, currentUser }) => {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    const handleMenuClick = (
        event: MouseEvent<HTMLElement>,
        userName: string,
    ) => {
        setMenuAnchor(event.currentTarget);
        setSelectedUser(userName);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedUser(null);
    };

    const handleMenuAction = (actionType: string) => {
        if (selectedUser) {
            onMenuAction(
                { currentTarget: menuAnchor } as MouseEvent<HTMLElement>,
                selectedUser,
                actionType,
            );
            handleMenuClose();
        }
    };

    const ownerActions = (currentUser: User | null, user: User) => {
        return !currentUser?.is_owner && user?.roles.includes('admin');
    };
    
    const allActions: Action[] = user.status === 'inactive'
        ? [
            { label: 'Activate', icon: VerifiedUserOutlinedIcon, type: 'Activate', disabled: ownerActions(currentUser, user) },
        ]
        : [
            { label: 'Change Permission', icon: KeyOutlinedIcon, type: 'Change_Permission', disabled: ownerActions(currentUser, user) },
            { label: 'Deactivate', icon: DeleteOutlineOutlinedIcon, type: 'Deactivate', disabled: ownerActions(currentUser, user) },
        ];
        
    const isCurrentUser = user.id === currentUser?.id;
    const isOwner = user?.is_owner;
    const isInactive = user?.status === 'inactive';

    const cardClass = [
        styles.cardContainer, 
        isCurrentUser && styles.cardContainerCurrentUser, 
        isInactive && styles.cardContainerInactive
    ].filter(Boolean).join(' ');

    return (
        <Box className={cardClass}>
            <Grid container direction="row">
                <Grid item xs={3} className={styles.gridItem}>
                    <Typography variant="captionMedium">Name</Typography>
                    <Typography variant="caption" className={styles.fieldValues}>
                        {user?.user_name}
                    </Typography>
                </Grid>
                <Grid item xs={3} className={styles.gridItem}>
                    <Typography variant="captionMedium">Email</Typography>
                    <Typography variant="caption" className={styles.fieldValues}>
                        {user?.email_address}
                    </Typography>
                </Grid>
                <Grid item xs={3.5} className={styles.gridItem}>
                    <Typography variant="captionMedium">Role</Typography>
                    <Typography variant="caption" className={styles.fieldValues}>
                        {user?.roles?.map((role: string) => {
                            const normalizedRole = role.toLowerCase() as RoleKey;
                            const { label, color } = rolesMapping[normalizedRole] || { label: role, color: 'info' };

                            return (
                                <Chip
                                    size="small"
                                    color={color}
                                    key={role}
                                    label={label}
                                    variant="outlined"
                                />
                            );
                        })}
                    </Typography>
                </Grid>
                <Grid item xs={2} className={styles.gridItemNoBorder}>
                    <Typography variant="captionMedium">Date added</Typography>
                    <Typography variant="caption" className={styles.fieldValues}>
                        {formatDate(user?.created_on)}
                    </Typography>
                </Grid>
                <Grid item xs={0.5} className={styles.gridItemNoBorder}>
                    {!(isOwner || isCurrentUser) &&
                        (<Box className={styles.menu} >

                            <IconButton
                                aria-controls="simple-menu"
                                aria-haspopup="true"
                                onClick={(event) => {
                                    handleMenuClick(event, user.user_name);
                                }}
                            >
                                <MoreVertIcon color="primary" />
                            </IconButton>
                            <Menu
                                id="simple-menu"
                                anchorEl={menuAnchor}
                                keepMounted
                                open={Boolean(menuAnchor)}
                                onClose={handleMenuClose}
                            >
                                {allActions.map((action) => (
                                    <MenuItem
                                        className={styles.menuItem}
                                        key={action.type}
                                        onClick={(event: React.MouseEvent<HTMLElement>) => {
                                            handleMenuAction(action.type);
                                        }}
                                        disabled={action.disabled}
                                    >
                                        <action.icon
                                            fontSize="small"
                                            color="primary"
                                            className={styles.menuIcons}
                                        />
                                        <Typography variant="bodyBold">
                                            {action.label}
                                        </Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>
                        )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default UserCard;
