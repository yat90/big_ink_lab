/** Application roles for access control. */
export enum Role {
  Admin = 'admin',
  Member = 'member',
}

export const ROLE_VALUES = [Role.Admin, Role.Member] as const;
export const DEFAULT_ROLE: Role = Role.Member;
