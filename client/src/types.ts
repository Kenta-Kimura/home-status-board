import statusDefinitions from '../../shared/statuses.json';

export type StatusId = (typeof statusDefinitions)[number]['id'];

export type StatusDefinition = {
  id: StatusId;
  label: string;
  description: string;
  autoClearable: boolean;
};

export type UserStatus = {
  id: string;
  name: string;
  status: StatusId;
  updatedAt: string;
  autoClearAt: string | null;
};

export type UsersResponse = {
  users: UserStatus[];
  statuses: StatusDefinition[];
};

export type AutoClearOption = {
  label: string;
  value: 'none' | 30 | 60 | 120;
};
