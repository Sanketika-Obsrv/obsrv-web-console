import React from "react";
import { InputAdornment, TextField, Button } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import styles from "./Filters.module.css";

interface FiltersProps {
    onSearchChange: (value: string) => void;
}

const Filters: React.FC<FiltersProps> = ({ onSearchChange }) => {

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(event.target.value);
      };

    return (
        <>
            <TextField
                placeholder="Search User"
                onChange={handleSearchChange}
                className={styles.searchField}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    ),
                }}
                sx={{
                    '& .MuiInputBase-root': {
                        height: '1.922rem',
                    },
                    '& .MuiInputBase-input': {
                        color: 'black',
                    },
                }}
            />
        </>
    );
};

export default Filters;