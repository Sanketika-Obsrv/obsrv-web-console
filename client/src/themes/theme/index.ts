import Default from './default';
import Theme7 from './theme7';
import { PaletteThemeProps } from 'types/theme';
import { PalettesProps } from '@ant-design/colors';
import { ThemeMode, PresetColor } from 'types/config';

const Theme = (colors: PalettesProps, presetColor: PresetColor, mode: ThemeMode): PaletteThemeProps => {
  switch (presetColor) {
    case 'default':
      return Theme7(colors, mode);
    default:
      return Default(colors);
  }
};

export default Theme;
