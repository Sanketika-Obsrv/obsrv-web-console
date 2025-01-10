import React, { useEffect, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Select, InputLabel, FormControl, Button, SelectChangeEvent } from '@mui/material';
import { UserRequest } from './UserManagement';
import { useUserList } from 'services/user';
import { User } from './UserManagement';
import { useAlert } from 'contexts/AlertContextProvider';
import Alert from '@mui/material/Alert';

interface AddUserProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (newUser: UserRequest) => Promise<void>;
    currentUser: User;
}

const rolesOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'dataset_manager', label: 'Dataset Manager' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'dataset_creator', label: 'Dataset Creator' },
    { value: 'ingestor', label: 'Ingestor' },
    { value: 'operations_admin', label: 'Operations Admin' }
];

const emailRegex = /^[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const AddUser: React.FC<AddUserProps> = ({ open, onClose, onSubmit, currentUser }) => {
    const [newUser, setNewUser] = useState<UserRequest>({
        user_name: '',
        email_address: '',
        password: '',
        roles: ['viewer'],
    });

    const [isUsernameTaken, setIsUsernameTaken] = useState<boolean | null>(null);
    const [isEmailTaken, setIsEmailTaken] = useState<boolean | null>(null);
    const { data: users } = useUserList();
    const { showAlert } = useAlert();
    const [error, setError] = useState<boolean | null>(null);

    useEffect(() => {
        const userName = newUser?.user_name.replace(/\s+/g, '_');
        const emailAddress = newUser?.email_address;
        if (userName || emailAddress) {
            const usernameExists = users?.data?.some((user: { user_name: string; }) => user.user_name === userName);
            setIsUsernameTaken(usernameExists || false);
        } else {
            setIsUsernameTaken(null);
        }

        if (emailAddress) {
            const emailExists = users?.data?.some((user: { email_address: string; }) => user.email_address === emailAddress);
            setIsEmailTaken(emailExists || false);
        } else {
            setIsEmailTaken(null);
        }
    }, [newUser.user_name, newUser.email_address, users]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewUser({
            ...newUser,
            [name]: value,
        });
    };

    const handleRoleChange = (e: SelectChangeEvent<string | string[]>) => {
        setNewUser({
            ...newUser,
            roles: [e.target.value] as string[],
        });
    };

    const handleSubmit = () => {
        onSubmit(newUser)
            .then(() => {
                onClose(); 
                resetForm(); 
            })
            .catch(() => {
                showAlert('Failed to create user', 'error');
                setError(true);
            });
    };
    

    const resetForm = () => {
        setNewUser({
            user_name: '',
            email_address: '',
            roles: ['viewer'],
            password: '',
        });
    };

    const isEmailValid = newUser?.email_address ? emailRegex.test(newUser?.email_address) : true;
    const isFirstNameValid = !newUser.first_name || newUser.first_name.length >= 3;
    const isLastNameValid = !newUser.last_name || newUser.last_name.length >= 3;
    const isFormValid =
        newUser?.user_name &&
        newUser?.email_address &&
        newUser?.password &&
        newUser?.roles.length > 0 &&
        isUsernameTaken === false &&
        isEmailValid &&
        isFirstNameValid &&
        isLastNameValid;

    const availableRoles = currentUser?.is_owner ? rolesOptions : rolesOptions.filter(role => role.value !== 'admin');

    const handleCancel = () => {
        resetForm();
        onClose();
    };

    const handleDialogClose = (event: React.SyntheticEvent, reason: string) => {
        if (reason && (reason !== 'backdropClick')) {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleDialogClose}
        >
            <DialogTitle>Create New User</DialogTitle>
            {error && <Alert severity="error">Failed to create User</Alert>}
            <DialogContent>
                <TextField
                    label="User Name"
                    name="user_name"
                    fullWidth
                    variant="outlined"
                    value={newUser.user_name}
                    onChange={handleChange}
                    required
                    margin="normal"
                    error={isUsernameTaken === true}
                    helperText={isUsernameTaken ? 'Username already exists' : ''}
                />
                <TextField
                    label="First Name"
                    name="first_name"
                    fullWidth
                    variant="outlined"
                    value={newUser.first_name}
                    onChange={handleChange}
                    margin="normal"
                    error={ !isFirstNameValid}
                    helperText={!isFirstNameValid ? 'If provided, first name must be at least 3 characters' : ''}
                />
                <TextField
                    label="Last Name"
                    name="last_name"
                    fullWidth
                    variant="outlined"
                    value={newUser.last_name}
                    onChange={handleChange}
                    margin="normal"
                    error={!isLastNameValid}
                    helperText={!isLastNameValid ? 'If provided, last name must be at least 3 characters' : ''}
                />
                <TextField
                    label="Email"
                    name="email_address"
                    type="email"
                    fullWidth
                    variant="outlined"
                    value={newUser.email_address}
                    onChange={handleChange}
                    required
                    margin="normal"
                    error={isEmailTaken === true || !isEmailValid}
                    helperText={isEmailTaken ? 'Email already exists' : !isEmailValid ? 'Invalid email format' : ''}
                />
                <TextField
                    label="Password"
                    name="password"
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={newUser.password}
                    onChange={handleChange}
                    required
                    margin="normal"
                    autoComplete="new-password"
                />
                <FormControl fullWidth margin="normal">
                    <InputLabel>Role</InputLabel>
                    <Select
                        name="role"
                        value={newUser.roles}
                        onChange={handleRoleChange}
                        label="Role"
                        defaultValue={['viewer']}
                    >
                        {availableRoles.map((role) => (
                            <MenuItem key={role.value} value={role.value} >
                                {role.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} color="primary" variant='outlined' size='small'>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} color="primary" variant='contained' size='small' disabled={!isFormValid}>
                    Create User
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddUser;
