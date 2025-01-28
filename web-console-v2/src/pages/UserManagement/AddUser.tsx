import React, { useEffect, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Select, InputLabel, FormControl, Button, SelectChangeEvent, InputAdornment, IconButton } from '@mui/material';
import { UserRequest } from './UserManagement';
import { useUserList } from 'services/user';
import { User } from './UserManagement';
import { useAlert } from 'contexts/AlertContextProvider';
import Alert from '@mui/material/Alert';
import { Visibility, VisibilityOff } from '@mui/icons-material';

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
    const [passwordRequirements, setPasswordRequirements] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false,
    });
    const [showPassword, setShowPassword] = useState<boolean>(false);

    useEffect(() => {
        const userName = newUser?.user_name.replace(/\s+/g, '_');
        const emailAddress = newUser?.email_address;
        if (userName || emailAddress) {
            const usernameExists = users?.data?.some((user: { user_name: string; }) => user.user_name.toLowerCase() === userName.toLowerCase());
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
        
        setNewUser(prev => ({
            ...prev,
            [name]: name === 'user_name' ? value.toLowerCase() : value
        }));
    
        if (name === 'password') {
            validatePassword(value);
        }
    };

    const validatePassword = (password: string) => {
        const updatedRequirements = {
            length: password.length >= 8 && password.length <= 15,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };

        setPasswordRequirements(updatedRequirements);
    };

    const getPasswordHelperText = () => {
        const requirements = [];

        if (!passwordRequirements.length) {
            requirements.push('8-15 characters');
        }
        if (!passwordRequirements.uppercase) {
            requirements.push('at least one uppercase letter');
        }
        if (!passwordRequirements.lowercase) {
            requirements.push('at least one lowercase letter');
        }
        if (!passwordRequirements.number) {
            requirements.push('at least one number');
        }
        if (!passwordRequirements.specialChar) {
            requirements.push('at least one special character');
        }

        if (requirements.length > 0) {
            return `Password must contain: ${requirements.join(', ')}`;
        } else {
            return '';
        }
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

    const isUserNameValid = newUser?.user_name && newUser?.user_name.length >= 3;
    const isEmailValid = newUser?.email_address ? emailRegex.test(newUser?.email_address) : true;
    const isFirstNameValid = !newUser?.first_name || newUser?.first_name.length >= 3;
    const isLastNameValid = !newUser?.last_name || newUser?.last_name.length >= 3;
    const isPasswordValid = newUser?.password && getPasswordHelperText() === '';
    const isFormValid =
        newUser?.email_address &&
        isPasswordValid &&
        newUser?.roles.length > 0 &&
        isUsernameTaken === false &&
        isEmailValid &&
        isFirstNameValid &&
        isLastNameValid &&
        isUserNameValid;

    const availableRoles = currentUser?.is_owner ? rolesOptions : rolesOptions.filter(role => role.value !== 'admin');

    const handleCancel = () => {
        setError(null);
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
                    error={isUsernameTaken === true || isUserNameValid === false}
                    helperText={isUsernameTaken ? 'Username already exists' : (isUserNameValid === false) ? 'Username must be at least 3 characters' : ''}
                />
                <TextField
                    label="First Name"
                    name="first_name"
                    fullWidth
                    variant="outlined"
                    value={newUser.first_name}
                    onChange={handleChange}
                    margin="normal"
                    error={!isFirstNameValid}
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
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    variant="outlined"
                    value={newUser.password}
                    onChange={handleChange}
                    required
                    margin="normal"
                    error={isPasswordValid === false}
                    helperText={isPasswordValid === false && getPasswordHelperText()}
                    autoComplete="new-password"
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                >
                                    {showPassword ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
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
