// import React, { useState, MouseEvent } from 'react';
// import {
//   Card,
//   CardContent,
//   Typography,
//   Box,
//   Menu,
//   MenuItem,
//   IconButton,
//   FormGroup,
//   FormControlLabel,
//   Checkbox,
// } from '@mui/material';
// import prettyBytes from 'pretty-bytes';
// import millify from 'millify';
// import MoreVertIcon from '@mui/icons-material/MoreVert';
// import styles from './DatasetlistCard.module.css';
// import * as _ from 'lodash';
// import { theme } from 'theme';

// interface Dataset {
//   dataset_id: string;
//   name: string;
//   status: string;
//   'completion %'?: number;
//   'Current Health'?: string;
//   'Health Score'?: number;
//   'Downtime Score'?: number;
//   'Importance Score'?: number;
//   size?: number;
//   volume?: number;
//   connector?: string;
//   tag?: string;
// }

// interface Action {
//   label: string;
//   icon: React.ElementType;
//   type: string;
// }

// interface DatasetlistCardProps {
//   dataset: Dataset;
//   draftDatasetConfigStatus: {
//     isIngestionFilled: boolean;
//     isProcessingFilled: boolean;
//     isStorageFilled: boolean;
//     progress: number;
//     isConnectorPresent: boolean;
//     isConnectorFilled: boolean;
//   };
//   actions: (status: string) => Action[];
//   onMenuAction: (
//     event: React.MouseEvent<HTMLElement>,
//     datasetId: string,
//     actionType: string,
//   ) => void;
// }

// enum DatasetStatus {
//   Draft = 'Draft',
// }

// const DatasetlistCard: React.FC<DatasetlistCardProps> = ({
//   dataset,
//   draftDatasetConfigStatus,
//   actions,
//   onMenuAction,
// }) => {
//   const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
//   const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

//   const handleMenuClick = (
//     event: MouseEvent<HTMLElement>,
//     datasetId: string,
//   ) => {
//     setMenuAnchor(event.currentTarget);
//     setSelectedDataset(datasetId);
//   };

//   const handleMenuClose = () => {
//     setMenuAnchor(null);
//     setSelectedDataset(null);
//   };

//   const handleMenuAction = (actionType: string) => {
//     if (selectedDataset) {
//       onMenuAction(
//         { currentTarget: menuAnchor } as MouseEvent<HTMLElement>,
//         selectedDataset,
//         actionType,
//       );
//       handleMenuClose();
//     }
//   };

//   const size = dataset.size ?? 0;
//   const volume = dataset.volume ?? 0;

//   const formattedSize = prettyBytes(size);
//   const formattedVolume = volume > 0 ? millify(volume) + ' Events' : '0';

//   const getStyle = (status: DatasetStatus, field: string): string => {
//     if (status === DatasetStatus.Draft) {
//       switch (field) {
//         case 'name':
//           return styles.draftName;
//         case 'status':
//           return styles.draftStatus;
//         case 'completion %':
//           return styles.draftCompletion;
//       }
//     }
//     return '';
//   };

//   const fieldOrder =
//     dataset.status === DatasetStatus.Draft
//       ? ['name', 'status', 'completion %']
//       : [
//           'name',
//           'status',
//           'Completion %',
//           'Current Health',
//           'Health Score',
//           'Downtime Score',
//           'Importance Score',
//           'Volume',
//           'Size',
//         ];

//   const cardClassName =
//     dataset.status === DatasetStatus.Draft ? styles.draft : '';

//   const filteredActions = actions(
//     (dataset.status && dataset.connector && dataset.tag) || '',
//   );

//   return (
//     <Box
//       key={dataset.dataset_id}
//       className={`${styles.datasetCard} ${cardClassName}`}
//     >
//       <Card className={styles.card}>
//         <CardContent
//           className={
//             dataset.status === 'Draft'
//               ? `${styles.cardContent} ${styles.draftStateCard}`
//               : styles.cardContent
//           }
//         >
//           <Box className={styles.scrollContainer}>
//             <Box display="flex" flexWrap="wrap" alignItems="center">
//               {fieldOrder.map((field, index) => (
//                 <Box
//                   key={field}
//                   className={` ${field === 'name' ? styles.name : styles.gridItem} ${getStyle(
//                     DatasetStatus[dataset.status as keyof typeof DatasetStatus],
//                     field,
//                   )} ${index === fieldOrder.length - 1 ? styles.noBorder : ''}`}
//                 >
//                   {dataset.status === DatasetStatus.Draft ? (
//                     <div className={styles.draftState}>
//                       {field !== 'name' && (
//                         <Typography variant="captionMedium">
//                           {_.capitalize(field)}
//                           <span className={styles.hyphen}>-</span>
//                         </Typography>
//                       )}
//                       <Typography variant="caption" >
//                         {field === 'status' ? (
//                           <Box className={styles.draftStatusGroup}>
//                             <span className={styles.draftStatusLabel}>
//                               {dataset[field as keyof Dataset] ?? 'NA'}
//                             </span>
//                             <FormGroup row className={styles.formGroup}>
//                               {draftDatasetConfigStatus.isConnectorPresent ? <FormControlLabel
//                                 control={
//                                   draftDatasetConfigStatus.isConnectorFilled ? (
//                                     <Checkbox
//                                       checked={draftDatasetConfigStatus.isConnectorFilled}
//                                       disabled
//                                       sx={{
//                                         color: theme.palette.secondary.main,
//                                         '&.Mui-checked': {
//                                           color: theme.palette.secondary.main,
//                                         },
//                                         '& .MuiSvgIcon-root': { fontSize: 16 }
//                                       }}
//                                     />
//                                   ) : (
//                                     <Box
//                                       className={styles.unchecked}
//                                     >
//                                     </Box>
//                                   )
//                                 }
//                                 label="Connectors"
//                               />: ''}
//                               <FormControlLabel
//                                 control={
//                                   draftDatasetConfigStatus.isIngestionFilled ? (
//                                     <Checkbox
//                                       checked={draftDatasetConfigStatus.isIngestionFilled}
//                                       disabled
//                                       sx={{
//                                         color: theme.palette.secondary.main,
//                                         '&.Mui-checked': {
//                                           color: theme.palette.secondary.main,
//                                         },
//                                         '& .MuiSvgIcon-root': { fontSize: 16 }
//                                       }}
//                                     />
//                                   ) : (
//                                     <Box
//                                       className={styles.unchecked}
//                                     >
//                                     </Box>
//                                   )
//                                 }
//                                 label="Ingestion"
//                               />
//                               <FormControlLabel
//                                 control={
//                                   draftDatasetConfigStatus.isProcessingFilled ? (
//                                     <Checkbox
//                                       checked={draftDatasetConfigStatus.isProcessingFilled}
//                                       disabled
//                                       sx={{
//                                         color: theme.palette.secondary.main,
//                                         '&.Mui-checked': {
//                                           color: theme.palette.secondary.main,
//                                         },
//                                         '& .MuiSvgIcon-root': { fontSize: 16 }
//                                       }}
//                                     />
//                                   ) : (
//                                     <Box
//                                       className={styles.unchecked}
//                                     >
//                                     </Box>
//                                   )
//                                 }
//                                 label="Processing"
//                               />
//                               <FormControlLabel
//                                 control={
//                                   draftDatasetConfigStatus.isStorageFilled ? (
//                                     <Checkbox
//                                       checked={draftDatasetConfigStatus.isStorageFilled}
//                                       disabled
//                                       sx={{
//                                         color: theme.palette.secondary.main,
//                                         '&.Mui-checked': {
//                                           color: theme.palette.secondary.main,
//                                         },
//                                         '& .MuiSvgIcon-root': { fontSize: 16 }
//                                       }}
//                                     />
//                                   ) : (
//                                     <Box
//                                       className={styles.unchecked}
//                                     >
//                                     </Box>
//                                   )
//                                 }
//                                 label="Storage"
//                               />
//                             </FormGroup>
//                           </Box>
//                         ) : field === 'completion %' ? (
//                           <LinearProgressWithLabel value={draftDatasetConfigStatus.progress} />
//                         ) : (
//                           dataset[field as keyof Dataset] ?? 'NA'
//                         )}
//                       </Typography>
//                     </div>
//                   ) : (
//                     <Box>
//                       <Typography
//                         className={`${field !== 'name' ? styles.label : ''}`}
//                         variant="captionMedium"
//                       >
//                         {_.capitalize(field)}
//                       </Typography>
//                       <Typography variant="caption" className={styles.content}>
//                         {field === 'Size'
//                           ? formattedSize
//                           : field === 'Volume'
//                             ? formattedVolume
//                             : dataset[field as keyof Dataset] ?? 'NA'}
//                       </Typography>
//                     </Box>
//                   )}
//                 </Box>
//               ))}
//               <Box className={styles.menu}>
//                 <Box>
//                   <IconButton
//                     aria-controls="simple-menu"
//                     aria-haspopup="true"
//                     onClick={(event) => {
//                       handleMenuClick(event, dataset.dataset_id);
//                     }}
//                   >
//                     <MoreVertIcon color="primary" />
//                   </IconButton>
//                   <Menu
//                     id="simple-menu"
//                     anchorEl={menuAnchor}
//                     keepMounted
//                     open={Boolean(menuAnchor)}
//                     onClose={handleMenuClose}
//                   >
//                     {filteredActions.map((action) => (
//                       <MenuItem
//                         className={styles.menuo}
//                         key={action.type}
//                         onClick={() => {
//                           handleMenuAction(action.type);
//                         }}
//                       >
//                         <action.icon
//                           fontSize="small"
//                           color="primary"
//                           className={styles.menuIcons}
//                         />
//                         <Typography variant="bodyBold">
//                           {action.label}
//                         </Typography>
//                       </MenuItem>
//                     ))}
//                   </Menu>
//                 </Box>
//               </Box>
//             </Box>
//           </Box>
//         </CardContent>
//       </Card>
//     </Box>
//   );
// };

// export default DatasetlistCard;
