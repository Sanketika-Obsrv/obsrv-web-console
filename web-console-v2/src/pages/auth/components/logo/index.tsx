/* eslint-disable */
import { To } from 'history';
import { ButtonBase } from '@mui/material';
import { SxProps } from '@mui/system';
import Logo from './LogoMain';
import LogoIcon from './LogoIcon';

interface Props {
  reverse?: boolean;
  isIcon?: boolean;
  sx?: SxProps;
  to?: To;
}

const LogoSection = ({ reverse, isIcon, sx, to }: Props) => (
  <ButtonBase 
  disableRipple sx={sx}>
    {isIcon ? <LogoIcon /> : <Logo reverse={reverse} />}
  </ButtonBase>
);

export default LogoSection;
