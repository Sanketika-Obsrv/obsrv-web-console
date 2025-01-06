import React from 'react';
import {
  Select,
  MenuItem,
  TextField,
  Box,
  InputAdornment,
  Typography,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import styles from './FilterdropDown.module.css';
import _ from 'lodash';

interface FilterdropDownProps {
  filters: {
    status: string[];
    connector: string[];
    tag: string[];
  };
  filterCriteria: {
    status: string[];
    connector: string[];
    tag: string[];
  };
  onFilterChange: (
    filterName: keyof FilterdropDownProps['filters'],
    values: string[],
  ) => void;
  onSearchChange: (value: string) => void;
  statusLabelMap: Record<string, string>;
  connectorLabelMap: Record<string, string>;
  tagLabelMap: Record<string, string>;
  onSortChange: (value: string) => void;
  sortCriteria: string;
}

const FilterdropDown: React.FC<FilterdropDownProps> = ({
  filters,
  filterCriteria,
  onFilterChange,
  onSearchChange,
  statusLabelMap,
  connectorLabelMap,
  tagLabelMap,
  onSortChange,
  sortCriteria
}) => {
  const handleMultiSelectChange =
    (filterName: keyof FilterdropDownProps['filters']) =>
      (event: SelectChangeEvent<string[]>) => {
        const selectedValues = event.target.value as string[];
        onFilterChange(filterName, selectedValues);
      };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const renderSelectValue = (
    selected: string[],
    placeholder: keyof FilterdropDownProps['filters'],
  ) => {
    const displayText =
      selected.length === 0 || selected.length === filters[placeholder].length
        ? _.startCase(placeholder)
        : selected.map((item) => {
          if (placeholder === 'status' && statusLabelMap[item]) {
            return statusLabelMap[item];
          }
          if (placeholder === 'connector' && connectorLabelMap[item]) {
            return connectorLabelMap[item];
          }
          if (placeholder === 'tag' && tagLabelMap[item]) {
            return tagLabelMap[item];
          }
          return _.startCase(_.toLower(item));
        }).join(', ');

    return displayText;
  };

  return (
    <Box className={styles.filtersContainer}>
      <Box>
        <Typography className={styles.heading} variant="bodyBold">
          Filter by
        </Typography>

        {['status', 'connector', 'tag'].map((filterName) => (
          <Select
            key={filterName}
            multiple
            value={
              filterCriteria[filterName as keyof FilterdropDownProps['filters']]
            }
            onChange={handleMultiSelectChange(
              filterName as keyof FilterdropDownProps['filters'],
            )}
            displayEmpty
            className={styles.filterSelect}
            IconComponent={KeyboardArrowDownIcon}
            inputProps={{
              'aria-label': _.startCase(filterName),
            }}
            renderValue={(selected) =>
              renderSelectValue(
                selected,
                filterName as keyof FilterdropDownProps['filters'],
              )
            }
            sx={{
              '& .MuiSelect-icon': {
                color: 'black',
              },
              '& .MuiSelect-select': {
                color: 'black',
              },
            }}
          >
            {filters[filterName as keyof FilterdropDownProps['filters']].map(
              (item) => (
                <MenuItem key={item} value={item}>
                  <Checkbox
                    checked={
                      filterCriteria[
                        filterName as keyof FilterdropDownProps['filters']
                      ].indexOf(item) > -1
                    }
                  />
                  <ListItemText
                    primary={
                      filterName === 'status' && statusLabelMap[item]
                        ? statusLabelMap[item]
                        : filterName === 'connector' && connectorLabelMap[item]
                          ? connectorLabelMap[item]
                          : filterName === 'tag' && tagLabelMap[item]
                            ? tagLabelMap[item]
                            : _.startCase(_.toLower(item))
                    }
                  />
                </MenuItem>
              ),
            )}
          </Select>
        ))}
      </Box>


      <div className={styles.search}>
        {/* <Select
          value={sortCriteria}
          onChange={(event: SelectChangeEvent<string>) =>
            onSortChange(event.target.value)
          }
          displayEmpty
          IconComponent={KeyboardArrowDownIcon}
          className={styles.filterSelect}
          sx={{
            '& .MuiSelect-icon': {
              color: 'black',
            },
            '& .MuiSelect-select': {
              color: 'black',
            },
          }}
        >
          <MenuItem value="last_updated_on">Last Updated On</MenuItem>
        </Select> */}
        <TextField
          placeholder="Search Dataset"
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
            '& .MuiInputBase-input': {
              color: 'black',
            },
          }}
        />
      </div>
    </Box>
  );
};

export default FilterdropDown;
