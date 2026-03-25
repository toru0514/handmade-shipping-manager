import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface PaletteColor {
    50?: string;
    200?: string;
  }

  interface SimplePaletteColorOptions {
    50?: string;
    200?: string;
  }
}
