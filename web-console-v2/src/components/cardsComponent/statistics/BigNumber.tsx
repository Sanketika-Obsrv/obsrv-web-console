import { styled } from '@mui/material/styles';
import { Card, CardContent, Grid, Typography } from '@mui/material';

import { GenericCardProps } from 'types/root';

const IconWrapper = styled('div')({
  position: 'absolute',
  left: '-17px',
  bottom: '-27px',
  color: '#fff',
  transform: 'rotate(25deg)',
  '& svg': {
    width: '100px',
    height: '100px',
    opacity: '0.35'
  }
});

interface MetricsProps {
  primary: string;
  secondary: string;
  iconPrimary: GenericCardProps['iconPrimary'];
  color: string;
  onClick: any
}

const BigNumberCard = ({ primary, secondary, iconPrimary, color, onClick }: MetricsProps) => {
  const IconPrimary = iconPrimary!;
  const primaryIcon = iconPrimary ? <IconPrimary fontSize="large" /> : null;

  return (
    <Card
    elevation={0} sx={{ background: color, position: 'relative', color: '#fff' }} onClick={onClick}>
      <CardContent>
        <IconWrapper>{primaryIcon}</IconWrapper>
        <Grid container direction="column" justifyContent="center" alignItems="center" spacing={1}>
          <Grid item sm={12}>
            <Typography variant="h3" align="center" color="inherit">
              {secondary}
            </Typography>
          </Grid>
          <Grid item sm={12}>
            <Typography variant="body1" align="center" color="inherit">
              {primary}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default BigNumberCard;
