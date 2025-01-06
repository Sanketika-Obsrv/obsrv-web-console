import React, { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useUserRoleManage } from 'services/user';
import { User } from './UserManagement';

interface ChangeRoleDialogProps {
    open: boolean;
    onClose: () => void;
    userName: string;
    currentRole: string;
    onRoleChanged: () => void;
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

const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({ open, onClose, userName, currentRole, onRoleChanged, currentUser }) => {
    const [newRole, setNewRole] = useState<string>(currentRole);
    const { mutate: changeRole } = useUserRoleManage();

    useEffect(() => {
        setNewRole(currentRole);
    }, [currentRole]);

    const handleChangeRole = () => {
        const payload = {
            user_name: userName,
            roles: [
                {
                    value: currentRole,
                    action: 'remove',
                },
                {
                    value: newRole,
                    action: 'upsert',
                },
            ],
        };

        changeRole(
            { payload },
            {
                onSuccess: () => {
                    onRoleChanged();
                    onClose();
                },
                onError: (error) => {
                    console.error('Error changing role:', error);
                },
            }
        );
    };

    const availableRoles = currentUser?.is_owner ? rolesOptions : rolesOptions.filter(role => role.value !== 'admin');

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogContent>
                <FormControl fullWidth margin="normal">
                    <InputLabel>Role</InputLabel>
                    <Select
                        name="change-role"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        label="Role"
                    >
                        {availableRoles.map((role) => (
                            <MenuItem key={role.value} value={role.value}>
                                {role.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary" variant="contained" size="small">Cancel</Button>
                <Button onClick={handleChangeRole} color="primary" variant="outlined" size="small">Change Role</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChangeRoleDialog;
