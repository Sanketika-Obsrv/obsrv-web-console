import React, { useEffect, useState } from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import Loader from 'components/Loader';
import { useUserList, useCreateDataset, useUserStatusManage, useUserRead } from 'services/user';
import AddIcon from '@mui/icons-material/Add';
import styles from './UserManagement.module.css';
import UserCard from './UserCard';
import Filters from './Filters';
import AddUser from './AddUser';
import ChangeRoleDialog from './ChangeRoleDialog';
import AlertDialog from 'components/AlertDialog/AlertDialog';

export interface User {
    id: string;
    user_name: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    provider?: string;
    email_address: string;
    mobile_number?: string;
    created_on: string;
    last_updated_on?: string;
    roles: string[];
    status: string;
    is_owner: boolean;
}

export type UserRequest = {
    user_name: string;
    first_name: string;
    last_name: string;
    email_address: string;
    password: string;
    roles: string[];
    status: string;
};

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchText, setSearchText] = useState<string>('');
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { mutate: createUser } = useCreateDataset();
    const { mutate: updateUserStatus } = useUserStatusManage();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [openRoleChangeDialog, setOpenRoleChangeDialog] = useState<boolean>(false);

    const { data, isLoading, refetch } = useUserList();
    const { data: currentUser } = useUserRead();
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingAction, setPendingAction] = useState<{ userName: string; } | null>(null);

    useEffect(() => {
        if (data) {
            setUsers(data.data);
        }
    }, [data]);

    const handleSearchChange = (value: string) => {
        setSearchText(value);
    };

    const filteredUsers = users.filter((user) => {
        const lowercasedSearchText = searchText.toLowerCase();
        return user.user_name.toLowerCase().includes(lowercasedSearchText);
    });
    
    const filteredUsersWithoutOwner = currentUser?.is_owner
        ? filteredUsers
        : filteredUsers.filter((user) => !user.is_owner);
    
    const sortedUsers = currentUser
        ? [
            currentUser,
            ...filteredUsersWithoutOwner
                .filter((user) => user.id !== currentUser.id)
                .sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime()),
        ]
        : filteredUsersWithoutOwner.sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());

    const activeUsers = sortedUsers.filter(user => user.status === 'active');
    const inactiveUsers = sortedUsers.filter(user => user.status === 'inactive');

    const combinedUsers = [...activeUsers, ...inactiveUsers];

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleAddUser = (newUser: UserRequest) => {
        setLoading(true);
        createUser(
            { payload: newUser },
            {
                onSuccess: () => {
                    refetch();
                    setOpenDialog(false);
                    setLoading(false);
                },
                onError: (error) => {
                    console.error('Error creating user:', error);
                },
            }
        );
    };

    const handleDeactivateUser = (userName: string) => {
        setLoading(true);
        updateUserStatus({
            payload: {
                user_name: userName,
                status: 'inactive',
            },
        },
            {
                onSuccess: () => {
                    refetch();
                    setLoading(false);
                },
                onError: (error) => {
                    console.error('Error deactivating user:', error);
                },
            }
        );
    };

    const handleActivateUser = (userName: string) => {
        setLoading(true);
        updateUserStatus({
            payload: {
                user_name: userName,
                status: 'active',
            },
        },
            {
                onSuccess: () => {
                    refetch();
                    setLoading(false);
                },
                onError: (error) => {
                    console.error('Error activating user:', error);
                },
            }
        );
    };

    const handleRoleChanged = () => {
        setLoading(true);
        refetch();
        setLoading(false)
    };

    const handleMenu = async (
        event: React.MouseEvent<HTMLElement> | undefined,
        userName: string,
        actionType: string,
    ) => {
        const user = users.find((user) => user.user_name === userName) as User;

        if (userName === undefined) {
            return;
        }

        switch (actionType) {
            case 'Change_Permission':
                setSelectedUser(user);
                setOpenRoleChangeDialog(true);
                break;
            case 'Deactivate':
                setPendingAction({ userName: user.user_name });
                setSelectedUser(user);
                setShowModal(true);
                break;
            case 'Activate':
                handleActivateUser(userName);
                break;
            default:
                break;
        }
    };

    const handleModalConfirm = async () => {
        if (pendingAction) {
            const { userName } = pendingAction;
            const user = users.find((user) => user.user_name === userName);

            if (user) {
                handleDeactivateUser(userName);
                setShowModal(false);
                setPendingAction(null);
            }
        }
    };

    const handleModalCancel = () => {
        setPendingAction(null);
        setShowModal(false);
    };

    return (
        <Box className={styles.mainContainer}>
            <Typography variant="majorh4">
                User Management
            </Typography>
            <Box className={styles.actionContainer}>
                <Typography variant="h1">
                    All Users <span style={{ color: 'grey' }}>{combinedUsers?.length}</span>
                </Typography>
                <Box>
                    <Filters onSearchChange={handleSearchChange} />
                    <Button
                        size="small"
                        type="button"
                        sx={{
                            mx: 1,
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                                borderColor: 'primary.main',
                            },
                        }}
                        variant="outlined"
                        startIcon={<AddIcon sx={{ fontSize: '1.25rem' }} />}
                        onClick={handleOpenDialog}
                    >
                        Add User
                    </Button>
                </Box>
            </Box>

            <AddUser
                open={openDialog}
                onClose={handleCloseDialog}
                onSubmit={handleAddUser}
                currentUser={currentUser}
            />

            <AlertDialog
                open={showModal}
                handleClose={handleModalCancel}
                action={handleModalConfirm}
                context={{
                    title: "Confirm Deactivation",
                    content: `Are you sure you want to deactivate the user "${pendingAction ? users.find(user => user.user_name === pendingAction.userName)?.user_name : ''}"?`,
                    show: true
                }}
            />

            {selectedUser && (
                <ChangeRoleDialog
                    open={openRoleChangeDialog}
                    onClose={() => setOpenRoleChangeDialog(false)}
                    userName={selectedUser?.user_name}
                    currentRole={selectedUser?.roles[0] || ''}
                    onRoleChanged={handleRoleChanged}
                    currentUser={currentUser}
                />
            )}

            {isLoading || loading ? (
                <Loader loading={isLoading || loading} />
            ) : (
                combinedUsers.map((user: User) => (
                    <Grid item xs={12} sm={6} md={4} key={user.id} >
                        <UserCard user={user}  onMenuAction={(event, userName: string, actionType: string) => {
                            handleMenu(event, userName, actionType);
                        }} currentUser={currentUser}/>
                    </Grid>
                ))
            )}
        </Box>
    );
};

export default UserManagement;