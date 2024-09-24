import { Box, Grid, Tab, Tabs, useTheme } from "@mui/material";
import { Outlet, useNavigate } from 'react-router-dom';
import _ from "lodash";

const alertTypeField = [
  { id: "custom", label: "Custom Alerts", path: "custom" },
  { id: "system", label: "System Alerts", path: "system" }
];

const AlertRules = () => {
  const theme = useTheme();
  const currentPath = window.location.pathname;
  const navigate = useNavigate();
  const selectedIndex = _.findIndex(alertTypeField, item => _.endsWith(currentPath, item.path));

  const handleChange = (event: any, newValue: any) => {
    const selectedPath = alertTypeField[newValue].path;
    navigate(`/alertRules/${selectedPath}`);
  };

  const renderTabs = () => {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          variant='standard'
          value={selectedIndex}
          onChange={handleChange}
          TabIndicatorProps={{hidden: true}}
          sx={{ 'background': '#FFFFFF' }}
        >
          {_.map(alertTypeField, (fields, index) => {
            const { label, id, path } = fields;
            return <Tab key={id} label={label} sx={{
              border: 'unset',
              "&.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white"
              }
            }} />
          })}
        </Tabs>
      </Box>
    )
  }

  const renderAlertRules = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} id="tabSectionStart">
          <Box sx={{ width: '100%' }}>
            {renderTabs()}
            <Grid marginTop={1}>
              <Outlet />
            </Grid>
          </Box>
        </Grid>
      </Grid>
    );
  }

  return <>{renderAlertRules()}</>
};

export default AlertRules;
