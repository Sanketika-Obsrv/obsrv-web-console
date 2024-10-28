import { Button, CardContent, Grid, Typography, Pagination } from '@mui/material';
import Avatar from 'components/@extended/Avatar';
import { AlertOutlined, BugFilled } from '@ant-design/icons';
import dayjs from 'dayjs'
import * as _ from 'lodash';
import { Stack } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import AlertMessage from 'components/AlertMessage';
import { useEffect, useState } from 'react';
import { fetchAlertsThunk } from 'store/middlewares';
import isBetween from 'dayjs/plugin/isBetween';
import { fetchFiringAlerts } from 'services/alerts';

dayjs.extend(isBetween);

const filterDates = (interval: any) => (alert: Record<string, any>) => {
  const from = dayjs().subtract(interval, 'minutes');
  const now = dayjs();
  const alertTime = dayjs(alert?.activeAt);
  return alertTime.isBetween(from, now);
}

const AlertsMessages = (props: any) => {
  const { predicate, interval } = props;
  const dispatch = useDispatch();
  const alertsState = useSelector((state: any) => state?.alerts);
  const alertsPerPage: any = useSelector((state: any) => state?.config?.validationLimit?.alertsPerPage || 10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const status = _.get(alertsState, 'status') || "idle";
  const alerts = fetchFiringAlerts(alertsState?.data || []);

  let filteredAlerts = predicate ? _.filter(alerts, predicate) : alerts;
  filteredAlerts = interval ? _.filter(filteredAlerts, filterDates(interval)) : filteredAlerts;

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAlertsThunk({}));
    }
  }, [status]);

  const getAlert = (alert: Record<string, any>) => {
    const color: any = _.get(alert, ['labels', 'severity']) === 'critical' ? 'error' : 'warning'
    const { transformedDescription } = alert;
    return <><Grid item xs={12}>
      <Grid container spacing={2}>
        <Grid item xs={1}>
          <Avatar type="filled" color={color} size="sm" sx={{ top: 10 }}>
            <AlertOutlined />
          </Avatar>
        </Grid>
        <Grid item xs={9}>
          <Grid container spacing={0}>
            <Grid item xs={12}>
              <Typography align="left" variant="caption" color="secondary">
                {dayjs(alert?.activeAt).format('MMMM D, YYYY h:mm A')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography align="left" variant="body2">
                <b>{alert?.labels?.alertname}</b>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography align="left" variant="body2">
                {transformedDescription}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={2}>
          <Stack direction="row" spacing={1}>
            <Button size='small' variant="contained">Resolve</Button>
            <Button size='small' variant="contained" color="info">Support</Button>
          </Stack>
        </Grid>
      </Grid>
    </Grid>
    </>
  }

  const renderAlerts = () => {
    const startIndex = (currentPage - 1) * alertsPerPage;
    const endIndex = startIndex + alertsPerPage;
    const alertsInPage = filteredAlerts.slice(startIndex, endIndex);
    return _.map(alertsInPage, getAlert);
  }

  const handleTablePageChange = (event: any, newPage: any) => {
    setCurrentPage(newPage);
  };

  const renderNoAlertsMessage = () => {
    return <Grid item xs={12}>
      <AlertMessage color='error' messsage={"No Alerts Found"} icon={BugFilled} />
    </Grid>
  }

  return <>
    <CardContent style={{ overflow: 'auto', height: 'auto' }}>
      <Grid
        container
        spacing={2.75}
        alignItems="center"
        sx={{
          position: 'relative',
          '&>*': {
            position: 'relative',
            zIndex: '5'
          },
          '&:after': {
            content: '""',
            position: 'absolute',
            top: 10,
            left: 38,
            width: 2,
            height: '100%',
            background: '#ebebeb',
            zIndex: '1'
          }
        }}
      >
        {status !== 'success' && renderNoAlertsMessage()}
        {status === 'success' && _.get(filteredAlerts, 'length') === 0 && renderNoAlertsMessage()}
        {status === 'success' && _.get(filteredAlerts, 'length') > 0 && renderAlerts()}
      </Grid>
    </CardContent>
    <Grid container marginTop={2}>
      <Grid item xs={12} display='flex' justifyContent='center'>
        {status === 'success' && _.get(filteredAlerts, 'length') > 0 &&
          <Pagination
            count={_.ceil(filteredAlerts.length / alertsPerPage)}
            page={currentPage}
            onChange={handleTablePageChange}
            shape="rounded"
          />
        }
      </Grid>
    </Grid>
  </>
};

export default AlertsMessages;
