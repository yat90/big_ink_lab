/** Shared Google Drive folder URLs for team resources (opens in new tab). */

export type TeamDriveLinkId = 'logos' | 'wappen' | 'merch' | 'meetings';

export const TEAM_DRIVE_MEETINGS_URL =
  'https://drive.google.com/drive/folders/19RplCMFfPTq0ogI3j05vnnBORPktbJUy?usp=share_link';

export const TEAM_DRIVE_LINKS: readonly { id: TeamDriveLinkId; href: string }[] = [
  {
    id: 'logos',
    href: 'https://drive.google.com/drive/folders/1oC_GKnG9m06ghLDOTiRLUeD-iElXvd3j?usp=share_link',
  },
  {
    id: 'wappen',
    href: 'https://drive.google.com/drive/folders/1Cv5K91zwFseeUPdzL9Iafqff5MGaVg18?usp=share_link',
  },
  {
    id: 'merch',
    href: 'https://drive.google.com/drive/folders/1qU_2AK7fjC6p2H_sOUwcQjPXheNbD-LW?usp=share_link',
  },
  {
    id: 'meetings',
    href: TEAM_DRIVE_MEETINGS_URL,
  },
];
