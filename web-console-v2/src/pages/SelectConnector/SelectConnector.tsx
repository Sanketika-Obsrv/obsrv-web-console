import React, { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styles from './SelectConnector.module.css';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import { Box, Button, Grid, Typography } from '@mui/material';
import ConnectorCard from 'components/ConnectorCard/ConnectorCard';
import { useNavigate } from 'react-router-dom';
import { useConnectorsList } from 'services/dataset';
import _ from 'lodash';
import Loader from 'components/Loader';

interface ConnectorType {
    id: string;
    name: string;
    type: string;
    iconurl: string;
    category: string;
}

interface FilterType {
    id: string;
    type: string;
}

const SelectConnector = () => {
    const [selectedTypes, setSelectedTypes] = useState<FilterType[]>([]);
    const [filteredItems, setFilteredItems] = useState<ConnectorType[]>([]);
    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSelected, setIsSelected] = useState<boolean>(false);
    const [filterOptions, setFilterOptions] = useState<FilterType[]>([]);

    const navigate = useNavigate();

    const {
        data: datasetListResponse,
        mutate: connectorListMutate,
        isPending
    } = useConnectorsList();

    useEffect(() => {
        const payload = {};
        connectorListMutate({ payload });
    }, []);

    useEffect(() => {
        const resultData = datasetListResponse?.data.result.data;

        if (!_.isEmpty(resultData)) {
            setFilteredItems(resultData);

            const categories = _.uniq(resultData.map((item: ConnectorType) => item.category));
            const newFilterOptions = categories.map((category: any) => ({
                id: category,
                type: category
            }));
            setFilterOptions(newFilterOptions);
        }
    }, [datasetListResponse]);

    useEffect(() => {
        const items = _.filter(datasetListResponse?.data.result.data, (item: ConnectorType) => {
            const matchesType =
                selectedTypes.length === 0 ||
                _.some(selectedTypes, (filter) => filter.type === item.category);
            const matchesSearch =
                _.isEmpty(searchQuery.trim()) ||
                _.includes(item.name.toLowerCase(), searchQuery.toLowerCase());
            return matchesType && matchesSearch;
        });

        setFilteredItems(items || []);
    }, [selectedTypes, searchQuery, datasetListResponse]);

    const handleFilterChange = (event: React.SyntheticEvent, value: FilterType | null) => {
        setSelectedTypes(value ? [value] : []);
        setSelectedCard(null);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
        setSelectedCard(null);
    };

    const getSelectedCardData = () => {
        return filteredItems.find((item) => item.id === selectedCard) || null;
    };

    const handleProceedClick = () => {
        const selectedCardData = getSelectedCardData();

        if (selectedCardData) {
            const { id: selectedCardId, name: selectedCardName } = selectedCardData;

            navigate('/home/new-dataset/connector-configuration', {
                state: { selectedCardId, selectedCardName }
            });
        }
    };
    const handleSkipClick = () => {
        navigate('/home/ingestion');
    };

    const handleCardClick = (id: string) => {
        setSelectedCard((prevSelectedCard) => (prevSelectedCard === id ? null : id));
    };

    useEffect(() => {
        setIsSelected(!!selectedCard);
    }, [selectedCard]);

    return (
        <>
            {isPending ? (
                <Loader loading={isPending} descriptionText="Loading the page" />
            ) : (
                <div className={styles.selectConnector}>
                    <Typography variant="h1" className={styles.mainInfo} lineHeight="2.125rem">
                        API connector has already pushed the data to Obsrv. You can configure
                        additional data with it.
                    </Typography>
                    <Typography variant="h2Secondary" className={styles.configureInfo}>
                        Configure Connector
                    </Typography>
                    <Box className={styles.searchAndFilter}>
                        <Paper variant="outlined" className={styles.search}>
                            <InputBase
                                sx={{
                                    'input::placeholder': {
                                        color: 'common.black',
                                        opacity: 1
                                    }
                                }}
                                onChange={handleSearchChange}
                                placeholder="Search by connector name"
                                inputProps={{ 'aria-label': 'search by connector name' }}
                                className={styles.searchField}
                            />
                            <IconButton
                                type="button"
                                aria-label="search"
                                className={styles.iconButton}
                            >
                                <SearchIcon className={styles.searchIcon} />
                            </IconButton>
                        </Paper>
                        <Autocomplete
                            id="tags-outlined"
                            options={filterOptions}
                            onChange={handleFilterChange}
                            value={selectedTypes[0] || null}
                            sx={{ width: '21.75rem' }}
                            getOptionLabel={(option) => option.type}
                            filterSelectedOptions
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            className={styles.autocompleteRoot}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Filter"
                                    InputProps={{
                                        ...params.InputProps,
                                        className: styles.inputField
                                    }}
                                    sx={{
                                        'input::placeholder': {
                                            color: 'common.black',
                                            opacity: 1
                                        }
                                    }}
                                />
                            )}
                            popupIcon={<ExpandMoreIcon className={styles.expandIcon} />}
                        />
                    </Box>
                    <Box className={styles.container}>
                        <Grid container className={styles.gridContainer} spacing={5}>
                            {filteredItems.map((connectorInfo: ConnectorType) => (
                                <Grid item key={connectorInfo.id} className={styles.gridItem}>
                                    <ConnectorCard
                                        name={connectorInfo.name}
                                        imageUrl={connectorInfo.iconurl}
                                        selected={selectedCard === connectorInfo.id}
                                        onClick={() => handleCardClick(connectorInfo.id)}
                                        isSelected={isSelected}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                        <Box mb={5}>
                            {selectedCard ? (
                                <Button
                                    variant="contained"
                                    className={styles.button}
                                    onClick={handleProceedClick}
                                >
                                    <Typography variant="buttonContained">Proceed</Typography>
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    className={styles.skipButton}
                                    onClick={handleSkipClick}
                                >
                                    <Typography variant="buttonContained">Skip</Typography>
                                </Button>
                            )}
                        </Box>
                    </Box>
                </div>
            )}
        </>
    );
};

export default SelectConnector;
