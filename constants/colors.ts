export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;
  bgElevated: string;
  border: string;
  borderLight: string;
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentLight: string;
  accentDim: string;
  accentSoft: string;

  assign: string;
  assignBg: string;
  complete: string;
  completeBg: string;
  cancel: string;
  cancelBg: string;

  statusActive: string;
  statusPending: string;
  statusCancelled: string;

  white: string;
  black: string;

  slack: string;
  slackBg: string;
  hubstaff: string;
  hubstaffBg: string;
  airtable: string;
  airtableBg: string;
  sheets: string;
  sheetsBg: string;

  tabBar: string;
  tabBarBorder: string;

  skeleton: string;
  overlay: string;

  shadow: string;
  shadowCard: string;

  terminal: string;
  terminalBg: string;
  terminalGreen: string;
  terminalDim: string;

  alertYellow: string;
  alertYellowBg: string;
  recollectRed: string;
  recollectRedBg: string;
  statsGreen: string;
  statsGreenBg: string;

  mxOrange: string;
  mxOrangeBg: string;
  sfBlue: string;
  sfBlueBg: string;

  gold: string;
  goldBg: string;
  silver: string;
  silverBg: string;
  bronze: string;
  bronzeBg: string;

  cardDepth: string;
}

export const LightTheme: ThemeColors = {
  bg: '#FAF8F3',
  bgSecondary: '#F3F0E8',
  bgCard: '#FFFFFF',
  bgInput: '#F5F2EB',
  bgElevated: '#EBE8E0',
  border: '#E5E1D8',
  borderLight: '#EDEAD2',
  borderFocus: '#8B6FC0',

  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',

  accent: '#7C3AED',
  accentLight: '#9461F5',
  accentDim: '#E2D9F3',
  accentSoft: '#F5F0FF',

  assign: '#7C3AED',
  assignBg: '#F5F0FF',
  complete: '#2D8A56',
  completeBg: '#E8F5EE',
  cancel: '#C53030',
  cancelBg: '#FDE8E8',

  statusActive: '#2D8A56',
  statusPending: '#B8860B',
  statusCancelled: '#C53030',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#5B3A6B',
  slackBg: '#F5EFF8',
  hubstaff: '#2D8A56',
  hubstaffBg: '#E8F5EE',
  airtable: '#B8860B',
  airtableBg: '#FEF5E5',
  sheets: '#2D8A56',
  sheetsBg: '#E8F5EE',

  tabBar: '#FFFFFF',
  tabBarBorder: 'transparent',

  skeleton: '#E5E1D8',
  overlay: 'rgba(0,0,0,0.18)',

  shadow: '#1A1400',
  shadowCard: 'rgba(26, 20, 0, 0.06)',

  terminal: '#7C3AED',
  terminalBg: '#FAF8F3',
  terminalGreen: '#2D8A56',
  terminalDim: '#A8A29E',

  alertYellow: '#A67C00',
  alertYellowBg: '#FFF8E1',
  recollectRed: '#C53030',
  recollectRedBg: '#FFF0F0',
  statsGreen: '#2D8A56',
  statsGreenBg: '#E8F8EE',

  mxOrange: '#C47A3A',
  mxOrangeBg: '#FFF3E8',
  sfBlue: '#4A6FA5',
  sfBlueBg: '#EEF3FA',

  gold: '#B8860B',
  goldBg: '#FFF8E1',
  silver: '#6B7280',
  silverBg: '#F3F4F6',
  bronze: '#A0522D',
  bronzeBg: '#FDF0E8',

  cardDepth: 'rgba(0,0,0,0.03)',
};

export const DarkTheme: ThemeColors = {
  bg: '#121214',
  bgSecondary: '#18181B',
  bgCard: '#1E1E22',
  bgInput: '#222226',
  bgElevated: '#2A2A2E',
  border: '#2E2E34',
  borderLight: '#36363C',
  borderFocus: '#A78BFA',

  textPrimary: '#EDEDF0',
  textSecondary: '#9E9DA6',
  textMuted: '#5C5B66',

  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentDim: '#2A1F4E',
  accentSoft: '#1A1530',

  assign: '#A78BFA',
  assignBg: '#1A1530',
  complete: '#5EBD8A',
  completeBg: '#0D1F18',
  cancel: '#E87070',
  cancelBg: '#200D0D',

  statusActive: '#5EBD8A',
  statusPending: '#D4A843',
  statusCancelled: '#E87070',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#C490C8',
  slackBg: '#1C101D',
  hubstaff: '#5EBD8A',
  hubstaffBg: '#0D1A12',
  airtable: '#D4A843',
  airtableBg: '#1A1408',
  sheets: '#5EBD8A',
  sheetsBg: '#0D1A12',

  tabBar: '#1E1E22',
  tabBarBorder: 'transparent',

  skeleton: '#2E2E34',
  overlay: 'rgba(0,0,0,0.6)',

  shadow: '#000000',
  shadowCard: 'rgba(0, 0, 0, 0.35)',

  terminal: '#A78BFA',
  terminalBg: '#121214',
  terminalGreen: '#5EBD8A',
  terminalDim: '#4A4958',

  alertYellow: '#D4A843',
  alertYellowBg: '#1A1608',
  recollectRed: '#E87070',
  recollectRedBg: '#1A0C0C',
  statsGreen: '#5EBD8A',
  statsGreenBg: '#0D1A12',

  mxOrange: '#E8A060',
  mxOrangeBg: '#1F1508',
  sfBlue: '#7BA3D4',
  sfBlueBg: '#0D1520',

  gold: '#D4A843',
  goldBg: '#1A1608',
  silver: '#9CA3AF',
  silverBg: '#1E1E22',
  bronze: '#C87B52',
  bronzeBg: '#1A1208',

  cardDepth: 'rgba(255,255,255,0.02)',
};
